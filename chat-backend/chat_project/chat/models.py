from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q


class ChatRoom(models.Model):
    """
    Represents a chat room (can be 1-on-1 or group chat)
    """
    users = models.ManyToManyField(User, related_name='chat_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    is_group = models.BooleanField(default=False)
    name = models.CharField(max_length=255, blank=True, null=True)  # For group chats
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        if self.is_group:
            return f"Group: {self.name}"
        users = self.users.all()[:2]
        return f"Chat: {' & '.join([u.username for u in users])}"
    
    @classmethod
    def get_or_create_private_room(cls, user1, user2):
        """
        Get or create a private chat room between two users.
        Ensures only one room exists between any two users.
        """
        # Find existing room with exactly these two users
        rooms = cls.objects.filter(
            is_group=False
        ).filter(
            users=user1
        ).filter(
            users=user2
        )
        
        if rooms.exists():
            return rooms.first(), False
        
        # Create new room
        room = cls.objects.create(is_group=False)
        room.users.add(user1, user2)
        return room, True


class Message(models.Model):
    """
    Represents a single message in a chat
    """
    chat_room = models.ForeignKey(
        ChatRoom, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    text = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    # For group chats, track who has read the message
    read_by = models.ManyToManyField(
        User, 
        related_name='read_messages', 
        blank=True
    )
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.sender.username}: {self.text[:50]}"
    
    def mark_as_read(self, user):
        """Mark message as read by a specific user"""
        if not self.chat_room.is_group:
            # For private chats, just use is_read flag
            if user != self.sender:
                self.is_read = True
                self.save()
        else:
            # For group chats, add to read_by
            self.read_by.add(user)


class TypingIndicator(models.Model):
    """
    Tracks who is currently typing in a chat room
    """
    chat_room = models.ForeignKey(
        ChatRoom, 
        on_delete=models.CASCADE, 
        related_name='typing_indicators'
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE
    )
    is_typing = models.BooleanField(default=False)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['chat_room', 'user']
    
    def __str__(self):
        return f"{self.user.username} typing in {self.chat_room}"