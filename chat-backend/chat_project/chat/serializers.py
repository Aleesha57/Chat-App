from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Message, ChatRoom


class UserSerializer(serializers.ModelSerializer):
    """Serialize user data"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class MessageSerializer(serializers.ModelSerializer):
    """Serialize message data with sender details"""
    sender = UserSerializer(read_only=True)
    sender_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 
            'chat_room', 
            'sender', 
            'sender_id',
            'text', 
            'timestamp', 
            'is_read',
            'read_by'
        ]
        read_only_fields = ['timestamp', 'is_read']
    
    def to_representation(self, instance):
        """
        Customize output format:
        - Format timestamp nicely
        - Add read_by usernames for group chats
        """
        representation = super().to_representation(instance)
        
        # Format timestamp
        representation['timestamp'] = instance.timestamp.isoformat()
        
        # For group chats, show who has read the message
        if instance.chat_room.is_group:
            representation['read_by_users'] = [
                user.username for user in instance.read_by.all()
            ]
        
        return representation


class ChatRoomSerializer(serializers.ModelSerializer):
    """Serialize chat room with participant details and last message"""
    users = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 
            'users', 
            'created_at', 
            'is_group', 
            'name',
            'last_message',
            'unread_count'
        ]
    
    def get_last_message(self, obj):
        """Get the most recent message in this chat room"""
        last_message = obj.messages.last()
        if last_message:
            return MessageSerializer(last_message).data
        return None
    
    def get_unread_count(self, obj):
        """Count unread messages for the current user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if obj.is_group:
                # For group chats, count messages not in read_by
                return obj.messages.exclude(
                    sender=request.user
                ).exclude(
                    read_by=request.user
                ).count()
            else:
                # For private chats, count unread messages not sent by user
                return obj.messages.filter(
                    is_read=False
                ).exclude(
                    sender=request.user
                ).count()
        return 0


class ChatRoomCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new chat rooms"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True
    )
    
    class Meta:
        model = ChatRoom
        fields = ['name', 'is_group', 'user_ids']
    
    def create(self, validated_data):
        """Create chat room and add users"""
        user_ids = validated_data.pop('user_ids')
        chat_room = ChatRoom.objects.create(**validated_data)
        
        # Add users to the room
        users = User.objects.filter(id__in=user_ids)
        chat_room.users.add(*users)
        
        return chat_room