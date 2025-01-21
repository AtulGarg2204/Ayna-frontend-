import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  IconButton, 
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useMediaQuery,
  useTheme,
  Avatar,
  Tooltip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import io from 'socket.io-client';

const ChatWindow = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Previous useEffect hooks remain same
  useEffect(() => {
    const savedSessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
    setSessions(savedSessions);
    if (savedSessions.length > 0) {
      setCurrentSession(savedSessions[0]);
    }
    const sessionMessages = JSON.parse(localStorage.getItem('sessionMessages') || '{}');
    setMessages(sessionMessages[savedSessions[0]?.id] || []);
  }, []);

  useEffect(() => {
    if (user && user.id) {
      const newSocket = io('https://ayna-backend-qfyg.onrender.com/');
      setSocket(newSocket);
      return () => newSocket.close();
    }
  }, [user]);

  useEffect(() => {
    if (socket && currentSession) {
      socket.on('message', (receivedMessage) => {
        setMessages(prevMessages => {
          const newMessages = [...prevMessages, receivedMessage];
          const sessionMessages = JSON.parse(localStorage.getItem('sessionMessages') || '{}');
          sessionMessages[currentSession.id] = newMessages;
          localStorage.setItem('sessionMessages', JSON.stringify(sessionMessages));
          return newMessages;
        });
      });

      const sessionMessages = JSON.parse(localStorage.getItem('sessionMessages') || '{}');
      setMessages(sessionMessages[currentSession.id] || []);

      return () => socket.off('message');
    }
  }, [socket, currentSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteSession = (sessionId) => {
    const isConfirmed = window.confirm('Are you sure you want to delete this chat?');
    
    if (isConfirmed) {
      const updatedSessions = sessions.filter(session => session.id !== sessionId);
      setSessions(updatedSessions);
      
      const sessionMessages = JSON.parse(localStorage.getItem('sessionMessages') || '{}');
      delete sessionMessages[sessionId];
      localStorage.setItem('sessionMessages', JSON.stringify(sessionMessages));
      localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
      
      if (currentSession?.id === sessionId) {
        const newCurrentSession = updatedSessions.length > 0 ? updatedSessions[0] : null;
        setCurrentSession(newCurrentSession);
        setMessages(newCurrentSession ? (sessionMessages[newCurrentSession.id] || []) : []);
      }
    }
  };

  const createNewSession = () => {
    const newSession = {
      id: Date.now().toString(),
      name: `Chat ${sessions.length + 1}`,
      createdAt: new Date().toISOString()
    };
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    setCurrentSession(newSession);
    localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
  };

  const switchSession = (session) => {
    setCurrentSession(session);
    const sessionMessages = JSON.parse(localStorage.getItem('sessionMessages') || '{}');
    setMessages(sessionMessages[session.id] || []);
    setDrawerOpen(false);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket && user?.id && currentSession) {
      const messageData = {
        text: message,
        userId: user.id,
        sessionId: currentSession.id,
        timestamp: new Date().toISOString()
      };
      socket.emit('message', messageData);
      setMessage('');
    }
  };

  const drawerWidth = 300;

  return (
    <Box sx={{ height: '100vh', display: 'flex', bgcolor: '#1a1a1a' }}>
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? drawerOpen : true}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#2C2C2C',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)'
          },
        }}
      >
        {/* User Profile Section */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              {user?.email.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ color: 'white' }} noWrap>
                {user?.email}
              </Typography>
              <Typography variant="caption" sx={{ color: '#4CAF50' }}>
                Online
              </Typography>
            </Box>
          </Box>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            fullWidth
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': {
                borderColor: 'error.main',
                bgcolor: 'rgba(255,0,0,0.1)'
              }
            }}
          >
            Log Out
          </Button>
        </Box>

        {/* New Chat Button */}
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createNewSession}
            sx={{
              bgcolor: 'primary.main',
              color: 'black',
              py: 1,
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            New Chat
          </Button>
        </Box>

        {/* Chat List */}
        <List sx={{ px: 1, overflow: 'auto' }}>
          {sessions.map((session) => (
            <ListItem
              key={session.id}
              sx={{
                borderRadius: 2,
                mb: 1,
                bgcolor: currentSession?.id === session.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)'
                }
              }}
            >
              <Box
                onClick={() => switchSession(session)}
                sx={{
                  display: 'flex',
                  flex: 1,
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 1
                }}
              >
                <ListItemIcon>
                  <ChatIcon sx={{ 
                    color: currentSession?.id === session.id ? 'primary.main' : 'rgba(255, 255, 255, 0.7)'
                  }} />
                </ListItemIcon>
                <ListItemText
                  primary={session.name}
                  secondary={new Date(session.createdAt).toLocaleDateString()}
                  primaryTypographyProps={{
                    color: 'white',
                    fontWeight: currentSession?.id === session.id ? 600 : 400
                  }}
                  secondaryTypographyProps={{
                    sx: { color: 'rgba(255, 255, 255, 0.5)' }
                  }}
                />
              </Box>
              <Tooltip title="Delete Chat">
                <IconButton
                  onClick={() => handleDeleteSession(session.id)}
                  sx={{
                    color: 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      color: 'error.main',
                      bgcolor: 'rgba(255,0,0,0.1)'
                    }
                  }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Chat Area */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: '#1E1E1E'
      }}>
        {/* Chat Header */}
        <Box sx={{ 
          p: 2, 
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: '#2C2C2C'
        }}>
          {isMobile && (
            <IconButton 
              edge="start" 
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2, color: 'white' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ color: 'white' }}>
            {currentSession?.name || 'Select a chat to start messaging'}
          </Typography>
        </Box>

        {/* Messages Area */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          {messages.map((msg, index) => (
            <Box
              key={index}
              sx={{
                alignSelf: msg.userId === user?.id ? 'flex-end' : 'flex-start',
                maxWidth: '70%'
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: msg.userId === user?.id ? '#0D47A1' : '#424242',
                  borderRadius: 3,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                <Typography variant="body1" sx={{ color: 'white' }}>
                  {msg.text}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block',
                    mt: 1,
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.75rem'
                  }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Typography>
              </Paper>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        {/* Message Input */}
        <Box 
          component="form" 
          onSubmit={sendMessage}
          sx={{ 
            p: 2,
            bgcolor: '#2C2C2C',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={currentSession ? "Type your message..." : "Select a chat to start messaging"}
              disabled={!currentSession}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 3,
                  color: 'white',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    }
                  }
                }
              }}
            />
            <Button 
              type="submit"
              variant="contained"
              disabled={!message.trim() || !currentSession}
              sx={{
                borderRadius: 3,
                px: 3,
                bgcolor: '#0D47A1',
                '&:hover': {
                  bgcolor: '#1565C0'
                }
              }}
            >
              <SendIcon />
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatWindow;