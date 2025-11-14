import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Message, ChatRoom, TypingIndicator
from .serializers import MessageSerializer


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat functionality
    
    Handles:
    - Connecting/disconnecting users
    - Sending/receiving messages
    - Typing indicators
    - Read receipts
    """
    
    async def connect(self):
        """
        Called when WebSocket connection is established
        """
        # Get chat room ID from URL
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        
        # Get user from scope (set by middleware)
        self.user = self.scope['user']
        
        # Verify user is authenticated
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Verify user is member of this chat room
        is_member = await self.check_room_membership()
        if not is_member:
            await self.close()
            return
        
        # Join room group (allows broadcasting to all connections in room)
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Accept WebSocket connection
        await self.accept()
        
        # Send confirmation message
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'Connected to room {self.room_id}'
        }))
    
    async def disconnect(self, close_code):
        """
        Called when WebSocket connection is closed
        """
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Clear typing indicator
        await self.clear_typing_indicator()
    
    async def receive(self, text_data):
        """
        Called when message is received from WebSocket
        
        Message types:
        - chat_message: New message
        - typing: User is typing
        - read_receipt: Message was read
        """
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'chat_message':
            await self.handle_chat_message(data)
        
        elif message_type == 'typing':
            await self.handle_typing(data)
        
        elif message_type == 'read_receipt':
            await self.handle_read_receipt(data)
    
    async def handle_chat_message(self, data):
        """Handle incoming chat message"""
        message_text = data.get('message', '').strip()
        
        if not message_text:
            return
        
        # Save message to database
        message = await self.save_message(message_text)
        
        if message:
            # Serialize message
            message_data = await self.serialize_message(message)
            
            # Broadcast message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message_handler',
                    'message': message_data
                }
            )
    
    async def handle_typing(self, data):
        """Handle typing indicator"""
        is_typing = data.get('is_typing', False)
        
        # Update typing indicator in database
        await self.update_typing_indicator(is_typing)
        
        # Broadcast typing status to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator_handler',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_typing': is_typing
            }
        )
    
    async def handle_read_receipt(self, data):
        """Handle read receipt for a message"""
        message_id = data.get('message_id')
        
        if message_id:
            await self.mark_message_read(message_id)
            
            # Broadcast read receipt to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'read_receipt_handler',
                    'message_id': message_id,
                    'user_id': self.user.id,
                    'username': self.user.username
                }
            )
    
    # Event handlers (called by channel layer)
    
    async def chat_message_handler(self, event):
        """Send chat message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))
    
    async def typing_indicator_handler(self, event):
        """Send typing indicator to WebSocket"""
        # Don't send typing indicator to the user who is typing
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))
    
    async def read_receipt_handler(self, event):
        """Send read receipt to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'username': event['username']
        }))
    
    # Database operations (use database_sync_to_async for sync operations)
    
    @database_sync_to_async
    def check_room_membership(self):
        """Check if user is member of chat room"""
        try:
            chat_room = ChatRoom.objects.get(id=self.room_id)
            return self.user in chat_room.users.all()
        except ChatRoom.DoesNotExist:
            return False
    
    @database_sync_to_async
    def save_message(self, message_text):
        """Save message to database"""
        try:
            chat_room = ChatRoom.objects.get(id=self.room_id)
            message = Message.objects.create(
                chat_room=chat_room,
                sender=self.user,
                text=message_text
            )
            return message
        except ChatRoom.DoesNotExist:
            return None
    
    @database_sync_to_async
    def serialize_message(self, message):
        """Convert message to JSON"""
        serializer = MessageSerializer(message)
        return serializer.data
    
    @database_sync_to_async
    def update_typing_indicator(self, is_typing):
        """Update typing indicator in database"""
        try:
            chat_room = ChatRoom.objects.get(id=self.room_id)
            indicator, created = TypingIndicator.objects.get_or_create(
                chat_room=chat_room,
                user=self.user
            )
            indicator.is_typing = is_typing
            indicator.save()
        except ChatRoom.DoesNotExist:
            pass
    
    @database_sync_to_async
    def clear_typing_indicator(self):
        """Clear typing indicator when user disconnects"""
        try:
            TypingIndicator.objects.filter(
                chat_room_id=self.room_id,
                user=self.user
            ).update(is_typing=False)
        except Exception:
            pass
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Mark message as read by current user"""
        try:
            message = Message.objects.get(id=message_id)
            message.mark_as_read(self.user)
        except Message.DoesNotExist:
            pass