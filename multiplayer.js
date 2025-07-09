class MultiplayerManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.playerColor = null;
        this.onMoveReceived = null;
        this.onConnectionEstablished = null;
        this.onConnectionClosed = null;
    }

    initialize() {
        return new Promise((resolve, reject) => {
            this.peer = new Peer();
            
            this.peer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                resolve(id);
            });
            
            this.peer.on('connection', (conn) => {
                if (this.connection) {
                    conn.close();
                    return;
                }
                
                this.handleConnection(conn);
                this.isHost = true;
                this.playerColor = 'white';
                
                conn.on('open', () => {
                    conn.send({
                        type: 'game-init',
                        hostColor: 'white',
                        guestColor: 'black'
                    });
                    
                    if (this.onConnectionEstablished) {
                        this.onConnectionEstablished(this.playerColor);
                    }
                });
            });
            
            this.peer.on('error', (err) => {
                console.error('PeerJS error:', err);
                reject(err);
            });
        });
    }

    connectToPeer(remotePeerId) {
        return new Promise((resolve, reject) => {
            if (this.connection) {
                reject(new Error('Already connected to a peer'));
                return;
            }
            
            const conn = this.peer.connect(remotePeerId);
            
            conn.on('open', () => {
                this.handleConnection(conn);
                this.isHost = false;
                resolve();
            });
            
            conn.on('error', (err) => {
                reject(err);
            });
            
            setTimeout(() => {
                if (!this.connection) {
                    conn.close();
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    handleConnection(conn) {
        this.connection = conn;
        
        conn.on('data', (data) => {
            this.handleData(data);
        });
        
        conn.on('close', () => {
            this.connection = null;
            if (this.onConnectionClosed) {
                this.onConnectionClosed();
            }
        });
        
        conn.on('error', (err) => {
            console.error('Connection error:', err);
        });
    }

    handleData(data) {
        switch (data.type) {
            case 'game-init':
                this.playerColor = data.guestColor;
                if (this.onConnectionEstablished) {
                    this.onConnectionEstablished(this.playerColor);
                }
                break;
                
            case 'move':
                if (this.onMoveReceived) {
                    this.onMoveReceived(data.move);
                }
                break;
                
            case 'new-game':
                if (this.onNewGameReceived) {
                    this.onNewGameReceived();
                }
                break;
        }
    }

    sendMove(move) {
        if (this.connection && this.connection.open) {
            this.connection.send({
                type: 'move',
                move: move
            });
        }
    }

    sendNewGame() {
        if (this.connection && this.connection.open) {
            this.connection.send({
                type: 'new-game'
            });
        }
    }

    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
    }
}
