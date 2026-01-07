import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { ChatMessageDto, NotificationDto } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SignalRService {
  private chatConnection: HubConnection | null = null;
  private notificationConnection: HubConnection | null = null;
  private messageHandlers: ((message: ChatMessageDto) => void)[] = [];
  private notificationHandlers: ((notification: NotificationDto) => void)[] = [];

  async connectChat(accessToken: string): Promise<void> {
    if (this.chatConnection) {
      await this.disconnectChat();
    }

    this.chatConnection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/chat`, {
        accessTokenFactory: () => accessToken,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    this.chatConnection.on('ReceiveMessage', (message: ChatMessageDto) => {
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.chatConnection.on('MessagesRead', () => {
      // Handle messages read event if needed
    });

    await this.chatConnection.start();
    console.log('Chat hub connected');
  }

  async connectNotifications(accessToken: string): Promise<void> {
    if (this.notificationConnection) {
      await this.disconnectNotifications();
    }

    this.notificationConnection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/notification`, {
        accessTokenFactory: () => accessToken,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    this.notificationConnection.on('ReceiveNotification', (notification: NotificationDto) => {
      this.notificationHandlers.forEach(handler => handler(notification));
    });

    await this.notificationConnection.start();
    console.log('Notification hub connected');
  }

  async disconnectChat(): Promise<void> {
    if (this.chatConnection) {
      await this.chatConnection.stop();
      this.chatConnection = null;
    }
  }

  async disconnectNotifications(): Promise<void> {
    if (this.notificationConnection) {
      await this.notificationConnection.stop();
      this.notificationConnection = null;
    }
  }

  async disconnectAll(): Promise<void> {
    await Promise.all([this.disconnectChat(), this.disconnectNotifications()]);
  }

  onMessage(handler: (message: ChatMessageDto) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onNotification(handler: (notification: NotificationDto) => void): () => void {
    this.notificationHandlers.push(handler);
    return () => {
      this.notificationHandlers = this.notificationHandlers.filter(h => h !== handler);
    };
  }

  async sendMessage(receiverId: string, content: string, subjectId?: string): Promise<void> {
    if (this.chatConnection) {
      await this.chatConnection.invoke('SendMessage', { receiverId, content, subjectId });
    }
  }

  async markAsRead(senderId: string): Promise<void> {
    if (this.chatConnection) {
      await this.chatConnection.invoke('MarkAsRead', senderId);
    }
  }
}

export const signalRService = new SignalRService();
