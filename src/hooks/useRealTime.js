import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../utils/firebase';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const CHANNEL_NAME = 'smehelp_realtime_channel';

// Helper to determine if Firebase is fully configured
const isFirebaseConfigured = () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  return apiKey && apiKey !== 'YOUR_API_KEY' && apiKey.trim() !== '';
};

export function useRealTime() {
  const [cases, setCases] = useState([]);
  const [messages, setMessages] = useState([]);
  const [teams, setTeams] = useState([]);
  const channelRef = useRef(null);
  const useFirebase = isFirebaseConfigured();

  // Load initial fallback state from localStorage
  useEffect(() => {
    if (!useFirebase) {
      const savedCases = localStorage.getItem('smehelp_cases');
      const savedMessages = localStorage.getItem('smehelp_messages');
      const savedTeams = localStorage.getItem('smehelp_teams');
      if (savedCases) setCases(JSON.parse(savedCases));
      if (savedMessages) setMessages(JSON.parse(savedMessages));
      if (savedTeams) {
        setTeams(JSON.parse(savedTeams));
      } else {
        const defaultTeams = [
          { id: 'team-alpha', name: 'Team Alpha', manager: 'Manager Mike', members: ['sconnor@enphase.com', 'Sarah Connor'] },
          { id: 'team-beta', name: 'Team Beta', manager: 'Manager Mike', members: ['j.installer@gmail.com', 'Installer Joe'] },
          { id: 'team-gamma', name: 'Team Gamma', manager: 'Manager Mike', members: ['mshariff@enphase.com', 'Mohammed Thayeeb Shariff'] }
        ];
        localStorage.setItem('smehelp_teams', JSON.stringify(defaultTeams));
        setTeams(defaultTeams);
      }
    }
  }, [useFirebase]);

  // Sync state helper for local fallback
  const syncLocalState = (updatedCases, updatedMessages, updatedTeams) => {
    if (updatedCases) {
      localStorage.setItem('smehelp_cases', JSON.stringify(updatedCases));
      setCases(updatedCases);
    }
    if (updatedMessages) {
      localStorage.setItem('smehelp_messages', JSON.stringify(updatedMessages));
      setMessages(updatedMessages);
    }
    if (updatedTeams) {
      localStorage.setItem('smehelp_teams', JSON.stringify(updatedTeams));
      setTeams(updatedTeams);
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

      // 3. Listen to Teams
      const teamsQuery = query(collection(db, 'teams'));
      const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
        const teamsList = [];
        snapshot.forEach((doc) => {
          teamsList.push({ id: doc.id, ...doc.data() });
        });
        
        if (teamsList.length === 0) {
          // Initialize defaults in firestore
          const defaultTeams = [
            { id: 'team-alpha', name: 'Team Alpha', manager: 'Manager Mike', members: ['sconnor@enphase.com', 'Sarah Connor'] },
            { id: 'team-beta', name: 'Team Beta', manager: 'Manager Mike', members: ['j.installer@gmail.com', 'Installer Joe'] },
            { id: 'team-gamma', name: 'Team Gamma', manager: 'Manager Mike', members: ['mshariff@enphase.com', 'Mohammed Thayeeb Shariff'] }
          ];
          defaultTeams.forEach(t => {
            setDoc(doc(db, 'teams', t.id), t);
          });
        } else {
          setTeams(teamsList);
        }
      }, (error) => {
        console.error("Firestore Teams Snapshot Error:", error);
      });

      return () => {
        unsubscribeCases();
        unsubscribeMessages();
        unsubscribeTeams();
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
            if (payload.teams) setTeams(payload.teams);
            break;
          default:
            const savedCases = localStorage.getItem('smehelp_cases');
            const savedMessages = localStorage.getItem('smehelp_messages');
            const savedTeams = localStorage.getItem('smehelp_teams');
            if (savedCases) setCases(JSON.parse(savedCases));
            if (savedMessages) setMessages(JSON.parse(savedMessages));
            if (savedTeams) setTeams(JSON.parse(savedTeams));
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
        await setDoc(doc(db, 'cases', newCase.id), newCase);
        await addDoc(collection(db, 'messages'), systemMsg);
      } catch (e) {
        console.error("Failed to create case in Firestore:", e);
      }
    } else {
      const updated = [newCase, ...cases];
      const systemMsgWithId = { ...systemMsg, id: `sys-${Date.now()}` };
      const updatedMsgs = [...messages, systemMsgWithId];
      
      syncLocalState(updated, updatedMsgs, null);
      broadcastLocal('CASE_CREATED', { cases: updated, messages: updatedMsgs });
    }
  };

  const acceptCase = async (caseId, smeName) => {
    const currentCase = cases.find(c => c.id === caseId);
    const createdAt = currentCase ? currentCase.createdAt : new Date().toISOString();
    const acceptedAt = new Date().toISOString();
    
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

      syncLocalState(updated, updatedMsgs, null);
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

      syncLocalState(updated, updatedMsgs, null);
      broadcastLocal('CASE_RESOLVED', { cases: updated, messages: updatedMsgs });
    }
  };

  const deleteCase = async (caseId) => {
    if (useFirebase) {
      try {
        await deleteDoc(doc(db, 'cases', caseId));
      } catch (e) {
        console.error("Failed to delete case in Firestore:", e);
      }
    } else {
      const updated = cases.filter(c => c.id !== caseId);
      syncLocalState(updated, null, null);
      broadcastLocal('SYNC_STATE', { cases: updated });
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
      syncLocalState(null, updated, null);
      broadcastLocal('MESSAGE_SENT', { messages: updated });
    }
  };

  const deleteMessage = async (messageId) => {
    if (useFirebase) {
      try {
        await deleteDoc(doc(db, 'messages', messageId));
      } catch (e) {
        console.error("Failed to delete message from Firestore:", e);
      }
    } else {
      const updated = messages.filter(m => m.id !== messageId);
      syncLocalState(null, updated, null);
      broadcastLocal('SYNC_STATE', { messages: updated });
    }
  };

  // Dynamic Teams Hub Actions
  const createTeam = async (name, manager) => {
    const newTeam = {
      id: `team-${Date.now()}`,
      name,
      manager,
      members: []
    };

    if (useFirebase) {
      try {
        await setDoc(doc(db, 'teams', newTeam.id), newTeam);
      } catch (e) {
        console.error("Failed to create team in Firestore:", e);
      }
    } else {
      const updated = [...teams, newTeam];
      syncLocalState(null, null, updated);
      broadcastLocal('SYNC_STATE', { teams: updated });
    }
  };

  const addTeamMember = async (teamId, email) => {
    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) return;

    // Avoid duplicates
    if (targetTeam.members.includes(email)) return;
    const updatedMembers = [...targetTeam.members, email];

    if (useFirebase) {
      try {
        await updateDoc(doc(db, 'teams', teamId), {
          members: updatedMembers
        });
      } catch (e) {
        console.error("Failed to add team member in Firestore:", e);
      }
    } else {
      const updated = teams.map(t => t.id === teamId ? { ...t, members: updatedMembers } : t);
      syncLocalState(null, null, updated);
      broadcastLocal('SYNC_STATE', { teams: updated });
    }
  };

  const assignTeamManager = async (teamId, manager) => {
    if (useFirebase) {
      try {
        await updateDoc(doc(db, 'teams', teamId), {
          manager
        });
      } catch (e) {
        console.error("Failed to assign manager in Firestore:", e);
      }
    } else {
      const updated = teams.map(t => t.id === teamId ? { ...t, manager } : t);
      syncLocalState(null, null, updated);
      broadcastLocal('SYNC_STATE', { teams: updated });
    }
  };

  const clearAllData = async () => {
    if (useFirebase) {
      console.warn("Wiping database in Firebase mode requires manual Firestore wipe.");
      setCases([]);
      setMessages([]);
    } else {
      localStorage.removeItem('smehelp_cases');
      localStorage.removeItem('smehelp_messages');
      localStorage.removeItem('smehelp_teams');
      setCases([]);
      setMessages([]);
      setTeams([]);
      broadcastLocal('SYNC_STATE', { cases: [], messages: [], teams: [] });
    }
  };

  return {
    cases,
    messages,
    teams,
    createCase,
    acceptCase,
    resolveCase,
    deleteCase,
    sendMessage,
    deleteMessage,
    createTeam,
    addTeamMember,
    assignTeamManager,
    clearAllData
  };
}
