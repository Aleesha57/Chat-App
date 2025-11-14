from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Message, ChatRoom
from .serializers import (
    MessageSerializer, 
    ChatRoomSerializer, 
    ChatRoomCreateSerializer,
    UserSerializer
)


class ChatRoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing chat rooms
    
    Endpoints:
    - GET /api/chatrooms/ - List all chat rooms for current user
    - POST /api/chatrooms/ - Create new chat room
    - GET /api/chatrooms/{id}/ - Get specific chat room
    - POST /api/chatrooms/get_or_create_private/ - Get/create private chat
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ChatRoomSerializer
    
    def get_queryset(self):
        """Only return chat rooms the user is part of"""
        return ChatRoom.objects.filter(
            users=self.request.user
        ).prefetch_related('users', 'messages')
    
    def get_serializer_class(self):
        """Use different serializer for create action"""
        if self.action == 'create':
            return ChatRoomCreateSerializer
        return ChatRoomSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new chat room (usually for group chats)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Add current user to the room
        user_ids = request.data.get('user_ids', [])
        if request.user.id not in user_ids:
            user_ids.append(request.user.id)
        
        serializer.validated_data['user_ids'] = user_ids
        chat_room = serializer.save()
        
        # Return full chat room data
        output_serializer = ChatRoomSerializer(
            chat_room, 
            context={'request': request}
        )
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def get_or_create_private(self, request):
        """
        Get or create a private chat room between current user and another user
        
        POST data: {"user_id": 2}
        """
        other_user_id = request.data.get('user_id')
        
        if not other_user_id:
            return Response(
                {'error': 'user_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get or create private room
        chat_room, created = ChatRoom.get_or_create_private_room(
            request.user, 
            other_user
        )
        
        serializer = ChatRoomSerializer(chat_room, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing messages
    
    Endpoints:
    - GET /api/messages/?chat_room={id} - List messages in a chat room (paginated)
    - POST /api/messages/ - Send a new message
    - POST /api/messages/{id}/mark_read/ - Mark message as read
    - POST /api/messages/mark_room_read/ - Mark all messages in room as read
    """
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        """Filter messages by chat room"""
        queryset = Message.objects.select_related('sender', 'chat_room')
        
        # Filter by chat room if provided
        chat_room_id = self.request.query_params.get('chat_room')
        if chat_room_id:
            queryset = queryset.filter(chat_room_id=chat_room_id)
        
        # Only show messages from rooms the user is part of
        queryset = queryset.filter(
            chat_room__users=self.request.user
        )
        
        return queryset.order_by('timestamp')
    
    def create(self, request, *args, **kwargs):
        """Send a new message"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set sender to current user
        serializer.validated_data['sender_id'] = request.user.id
        
        # Verify user is in the chat room
        chat_room_id = request.data.get('chat_room')
        try:
            chat_room = ChatRoom.objects.get(id=chat_room_id)
            if request.user not in chat_room.users.all():
                return Response(
                    {'error': 'You are not a member of this chat room'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except ChatRoom.DoesNotExist:
            return Response(
                {'error': 'Chat room not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        message = serializer.save()
        
        return Response(
            MessageSerializer(message).data, 
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a specific message as read"""
        message = self.get_object()
        message.mark_as_read(request.user)
        
        return Response({'status': 'Message marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_room_read(self, request):
        """Mark all messages in a room as read"""
        chat_room_id = request.data.get('chat_room_id')
        
        if not chat_room_id:
            return Response(
                {'error': 'chat_room_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            chat_room = ChatRoom.objects.get(id=chat_room_id)
        except ChatRoom.DoesNotExist:
            return Response(
                {'error': 'Chat room not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Mark all unread messages as read
        if chat_room.is_group:
            messages = chat_room.messages.exclude(sender=request.user)
            for message in messages:
                message.read_by.add(request.user)
        else:
            chat_room.messages.filter(
                is_read=False
            ).exclude(
                sender=request.user
            ).update(is_read=True)
        
        return Response({'status': 'All messages marked as read'})


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing users (for finding people to chat with)
    
    Endpoints:
    - GET /api/users/ - List all users
    - GET /api/users/{id}/ - Get specific user
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]