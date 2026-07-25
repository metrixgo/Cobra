(function () {
  const config = window.COBRA_FIREBASE_CONFIG;
  let workspaceRef;
  let saveTimer;
  let started = false;
  let activeRoom;

  function roomId() {
    const url = new URL(window.location.href);
    let room = url.searchParams.get('room');
    if (!room) {
      room = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      url.searchParams.set('room', room);
      window.history.replaceState({}, '', url);
    }
    activeRoom = room.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'shared-room';
    return activeRoom;
  }

  window.cobraCollaboration = {
    start({ getWorkspace, applyWorkspace, setStatus }) {
      if (!config || !window.firebase) {
        setStatus('Private workspace', false);
        return;
      }
      try {
        if (!firebase.apps.length) firebase.initializeApp(config);
        workspaceRef = firebase.firestore().collection('cobraRooms').doc(roomId());
        setStatus('Connecting to shared room…', false);
        workspaceRef.onSnapshot((snapshot) => {
          const remoteWorkspace = snapshot.data()?.workspace;
          if (typeof remoteWorkspace === 'string') applyWorkspace(remoteWorkspace);
          else this.save(getWorkspace());
          setStatus('Shared room: live', true);
        }, () => setStatus('Collaboration unavailable', false));
        started = true;
      } catch (_) {
        setStatus('Collaboration unavailable', false);
      }
    },
    save(workspace) {
      if (!started || !workspaceRef) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        workspaceRef.set({ workspace, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
          .catch(() => { /* The status is updated by the snapshot listener. */ });
      }, 250);
    },
    shareUrl() {
      const room = activeRoom || roomId();
      return new URL(`?room=${encodeURIComponent(room)}`, window.location.href).href;
    }
  };
}());
