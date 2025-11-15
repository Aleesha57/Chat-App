from django.contrib import admin
from .models import ChatRoom, Message, TypingIndicator

@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'is_group', 'created_at')
    search_fields = ('name', 'users__username')
    list_filter = ('is_group', 'created_at')
    readonly_fields = ('created_at',)
    filter_horizontal = ('users',)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'chat_room', 'sender', 'timestamp', 'is_read')
    search_fields = ('text', 'sender__username', 'chat_room__name')
    list_filter = ('timestamp', 'is_read', 'chat_room')
    readonly_fields = ('timestamp',)
    filter_horizontal = ('read_by',)

@admin.register(TypingIndicator)
class TypingIndicatorAdmin(admin.ModelAdmin):
    list_display = ('id', 'chat_room', 'user', 'is_typing', 'last_updated')
    search_fields = ('user__username', 'chat_room__name')
    list_filter = ('is_typing', 'last_updated')
    readonly_fields = ('last_updated',)