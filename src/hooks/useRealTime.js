import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../utils/firebase';
import { collection, doc, setDoc, addDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const CHANNEL_NAME = 'smehelp_realtime_channel';

// Helper to determine if Firebase is fully configured
const isFirebaseConfigured = () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  return apiKey && apiKey !== 'YOUR_API_KEY' && apiKey.trim() !== '';
};

export function useRealTime() {
  const [cases, setCases] = useState([]);
  const [messages, setMessages] = useState([]);
  const channelRef = useRef(null);
  const useFirebase = isFirebaseConfigured();

  // Load initial fallback state from localStorage
  useEffect(() => {
    if (!useFirebase) {
      const savedCases = localStorage.getItem('smehelp_cases');
      const savedMessages = localStorage.getItem('smehelp_messages');
      if (savedCases) setCases(JSON.parse(savedCases));
      if (savedMessages) setMessages(JSON.parse(savedMessages));
    }
  }, [useFirebase]);

  // Sync state helper for local fallback
  const syncLocalState = (updatedCases, updatedMessages) => {
    if (updatedCases) {
      localStorage.setItem('smehelp_cases', JSON.stringify(updatedCases));
      setCases(updatedCases);
    }
    if (updatedMessages) {
      localStorage.setItem('smehelp_messages', JSON.stringify(updatedMessages));
      setMessages(updatedMessages);
    }
  };

  useEffect(() => {
    if (useFirebase) {
      // 1. Listen to Cases
      const casesQuery = query(collection(db, 'cases'), orderBy('createdAt', 'desc'));
      const unsubscribeCases = onSnapshot(casesQuery, (snapshot) => {
        const casesList = [];
        snapshot.forEach((doc) => {
          casesList.push({ id: doc.id, ...doc.data() });
        });
        setCases(casesList);
      }, (error) => {
        console.error("Firestore Cases Snapshot Error:", error);
      });

      // 2. Listen to Messages
      const messagesQuery = query(collection(db, 'messages'), orderBy('timestampOrder', 'asc'));
      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const msgsList = [];
        snapshot.forEach((doc) => {
          msgsList.push({ id: doc.id, ...doc.data() });
        });
        setMessages(msgsList);
      }, (error) => {
        console.error("Firestore Messages Snapshot Error:", error);
      });

      return () => {
        unsubscribeCases();
        unsubscribeMessages();
      };
    } else {
      // Fallback: Create BroadcastChannel
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        switch (type) {
          case 'SYNC_STATE':
            if (payload.cases) setCases(payload.cases);
            if (payload.messages) setMessages(payload.messages);
            break;
          default:
            const savedCases = localStorage.getItem('smehelp_cases');
            const savedMessages = localStorage.getItem('smehelp_messages');
            if (savedCases) setCases(JSON.parse(savedCases));
            if (savedMessages) setMessages(JSON.parse(savedMessages));
            break;
        }
      };

      return () => {
        channel.close();
      };
    }
  }, [useFirebase]);

  // Broadcast function for fallback
  const broadcastLocal = (type, payload = {}) => {
    if (channelRef.current) {
      channelRef.current.postMessage({ type, payload });
    }
  };

  // Actions
  const createCase = async (newCase) => {
    // Add a system message for case creation
    const systemMsg = {
      caseId: newCase.id,
      senderName: 'System',
      senderRole: 'system',
      text: `Case created by Engineer ${newCase.engineerName}. Waiting for an SME to join...`,
      media: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampOrder: Date.now()
    };

    if (useFirebase) {
      try {
        // Save case to Firestore
        await setDoc(doc(db, 'cases', newCase.id), newCase);
        // Save system message to Firestore
        await addDoc(collection(db, 'messages'), systemMsg);
      } catch (e) {
        console.error("Failed to create case in Firestore:", e);
      }
    } else {
      const updated = [newCase, ...cases];
      const systemMsgWithId = { ...systemMsg, id: `sys-${Date.now()}` };
      const updatedMsgs = [...messages, systemMsgWithId];
      
      syncLocalState(updated, updatedMsgs);
      broadcastLocal('CASE_CREATED', { cases: updated, messages: updatedMsgs });
    }
  };

  const acceptCase = async (caseId, smeName) => {
    const currentCase = cases.find(c => c.id === caseId);
    const createdAt = currentCase ? currentCase.createdAt : new Date().toISOString();
    const acceptedAt = new Date().toISOString();
    
    // Calculate wait time
    const waitMs = new Date(acceptedAt) - new Date(createdAt);
    const waitSecs = Math.max(0, Math.floor(waitMs / 1000));
    const mins = Math.floor(waitSecs / 60);
    const secs = waitSecs % 60;
    const waitDuration = `${mins}m ${secs}s`;

    const systemMsg = {
      caseId,
      senderName: 'System',
      senderRole: 'system',
      text: `SME ${smeName} accepted the case and joined the workspace. (Wait time: ${waitDuration})`,
      media: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampOrder: Date.now()
    };

    if (useFirebase) {
      try {
        const caseRef = doc(db, 'cases', caseId);
        await updateDoc(caseRef, {
          status: 'active',
          smeName,
          acceptedAt,
          waitDuration
        });
        await addDoc(collection(db, 'messages'), systemMsg);
      } catch (e) {
        console.error("Failed to accept case in Firestore:", e);
      }
    } else {
      const updated = cases.map(c => {
        if (c.id === caseId) {
          return {
            ...c,
            status: 'active',
            smeName,
            acceptedAt,
            waitDuration
          };
        }
        return c;
      });

      const systemMsgWithId = { ...systemMsg, id: `sys-${Date.now()}` };
      const updatedMsgs = [...messages, systemMsgWithId];

      syncLocalState(updated, updatedMsgs);
      broadcastLocal('CASE_ACCEPTED', { cases: updated, messages: updatedMsgs });
    }
  };

  const resolveCase = async (caseId) => {
    const systemMsg = {
      caseId,
      senderName: 'System',
      senderRole: 'system',
      text: `This case has been marked as RESOLVED.`,
      media: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampOrder: Date.now()
    };

    if (useFirebase) {
      try {
        const caseRef = doc(db, 'cases', caseId);
        await updateDoc(caseRef, {
          status: 'resolved',
          resolvedAt: new Date().toISOString()
        });
        await addDoc(collection(db, 'messages'), systemMsg);
      } catch (e) {
        console.error("Failed to resolve case in Firestore:", e);
      }
    } else {
      const updated = cases.map(c => {
        if (c.id === caseId) {
          return {
            ...c,
            status: 'resolved',
            resolvedAt: new Date().toISOString()
          };
        }
        return c;
      });

      const systemMsgWithId = { ...systemMsg, id: `sys-${Date.now()}` };
      const updatedMsgs = [...messages, systemMsgWithId];

      syncLocalState(updated, updatedMsgs);
      broadcastLocal('CASE_RESOLVED', { cases: updated, messages: updatedMsgs });
    }
  };

  const sendMessage = async (caseId, senderName, senderRole, text, media = null) => {
    const newMsg = {
      caseId,
      senderName,
      senderRole,
      text,
      media,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampOrder: Date.now()
    };

    if (useFirebase) {
      try {
        await addDoc(collection(db, 'messages'), newMsg);
      } catch (e) {
        console.error("Failed to send message to Firestore:", e);
      }
    } else {
      const newMsgWithId = { ...newMsg, id: `msg-${Date.now()}` };
      const updated = [...messages, newMsgWithId];
      syncLocalState(null, updated);
      broadcastLocal('MESSAGE_SENT', { messages: updated });
    }
  };

  const clearAllData = async () => {
    if (useFirebase) {
      // In production Firebase, bulk delete is handled by backend or individual deletes.
      // For this demo, we'll notify that database wipe is local or can clear state.
      console.warn("Wiping database in Firebase mode requires manual Firestore wipe.");
      setCases([]);
      setMessages([]);
    } else {
      localStorage.removeItem('smehelp_cases');
      localStorage.removeItem('smehelp_messages');
      setCases([]);
      setMessages([]);
      broadcastLocal('SYNC_STATE', { cases: [], messages: [] });
    }
  };

  return {
    cases,
    messages,
    createCase,
    acceptCase,
    resolveCase,
    sendMessage,
    clearAllData
  };
}
