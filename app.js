class ChessGame {
    constructor() {
        this.chess = new Chess();
        this.multiplayer = new MultiplayerManager();
        this.boardElement = document.getElementById('chess-board');
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.playerColor = null;
        this.gameActive = false;
        
        this.initializeUI();
        this.initializeMultiplayer();
    }

    initializeUI() {
        this.createBoard();
        this.updateDisplay();
        
        // Copy ID button
        document.getElementById('copy-id').addEventListener('click', () => {
            const peerId = document.getElementById('peer-id').textContent;
            navigator.clipboard.writeText(peerId).then(() => {
                alert('ID copied to clipboard!');
            });
        });
        
        // Connect button
        document.getElementById('connect-btn').addEventListener('click', () => {
            const remotePeerId = document.getElementById('remote-peer-id').value.trim();
            if (remotePeerId) {
                this.connectToPeer(remotePeerId);
            }
        });
        
        // New game button
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.newGame();
        });
    }

    async initializeMultiplayer() {
        try {
            const peerId = await this.multiplayer.initialize();
            document.getElementById('peer-id').textContent = peerId;
            
            this.multiplayer.onConnectionEstablished = (color) => {
                this.playerColor = color;
                this.gameActive = true;
                document.getElementById('connection-status').textContent = 'Connected!';
                document.getElementById('connection-status').className = 'status connected';
                document.getElementById('color-display').textContent = color;
                document.querySelector('.game-container').classList.add('active');
                this.updateDisplay();
            };
            
            this.multiplayer.onMoveReceived = (move) => {
                this.chess.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
                this.updateDisplay();
                this.checkGameEnd();
            };
            
            this.multiplayer.onNewGameReceived = () => {
                this.resetGame();
            };
            
            this.multiplayer.onConnectionClosed = () => {
                this.gameActive = false;
                document.getElementById('connection-status').textContent = 'Disconnected';
                document.getElementById('connection-status').className = 'status error';
                alert('Connection lost!');
            };
            
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
            document.getElementById('peer-id').textContent = 'Error';
            document.getElementById('connection-status').textContent = 'Failed to initialize';
            document.getElementById('connection-status').className = 'status error';
        }
    }

    async connectToPeer(remotePeerId) {
        try {
            document.getElementById('connection-status').textContent = 'Connecting...';
            document.getElementById('connection-status').className = 'status';
            
            await this.multiplayer.connectToPeer(remotePeerId);
            
        } catch (error) {
            console.error('Failed to connect:', error);
            document.getElementById('connection-status').textContent = 'Connection failed';
            document.getElementById('connection-status').className = 'status error';
        }
    }

    createBoard() {
        this.boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = 'square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = row;
                square.dataset.col = col;
                
                square.addEventListener('click', () => this.handleSquareClick(row, col));
                
                this.boardElement.appendChild(square);
            }
        }
    }

    handleSquareClick(row, col) {
        if (!this.gameActive || this.chess.currentTurn !== this.playerColor) return;
        
        const piece = this.chess.board[row][col];
        
        if (this.selectedSquare) {
            const [fromRow, fromCol] = this.selectedSquare;
            
            if (row === fromRow && col === fromCol) {
                this.clearSelection();
                return;
            }
            
            if (this.possibleMoves.some(move => move[0] === row && move[1] === col)) {
                const moveData = {
                    from: { row: fromRow, col: fromCol },
                    to: { row, col }
                };
                
                if (this.chess.makeMove(fromRow, fromCol, row, col)) {
                    this.multiplayer.sendMove(moveData);
                    this.clearSelection();
                    this.updateDisplay();
                    this.checkGameEnd();
                }
            } else {
                this.clearSelection();
                if (piece && piece.color === this.chess.currentTurn) {
                    this.selectPiece(row, col);
                }
            }
        } else {
            if (piece && piece.color === this.chess.currentTurn) {
                this.selectPiece(row, col);
            }
        }
    }

    selectPiece(row, col) {
        this.selectedSquare = [row, col];
        this.possibleMoves = this.chess.getPossibleMoves(row, col);
        this.updateBoardHighlights();
    }

    clearSelection() {
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.updateBoardHighlights();
    }

    updateBoardHighlights() {
        const squares = this.boardElement.querySelectorAll('.square');
        
        squares.forEach(square => {
            square.classList.remove('selected', 'possible-move', 'possible-capture');
            
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            if (this.selectedSquare && row === this.selectedSquare[0] && col === this.selectedSquare[1]) {
                square.classList.add('selected');
            }
            
            if (this.possibleMoves.some(move => move[0] === row && move[1] === col)) {
                if (this.chess.board[row][col]) {
                    square.classList.add('possible-capture');
                } else {
                    square.classList.add('possible-move');
                }
            }
        });
    }

    updateDisplay() {
        // Update board pieces
        const squares = this.boardElement.querySelectorAll('.square');
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.chess.board[row][col];
            
            square.innerHTML = piece ? `<span class="piece">${piece.piece}</span>` : '';
        });
        
        // Update turn indicator
        document.getElementById('turn-indicator').textContent = 
            `${this.chess.currentTurn.charAt(0).toUpperCase() + this.chess.currentTurn.slice(1)}'s Turn`;
        
        // Update captured pieces
        this.updateCapturedPieces();
    }

    updateCapturedPieces() {
        const whiteCaptured = document.getElementById('white-captured-pieces');
        const blackCaptured = document.getElementById('black-captured-pieces');
        
        whiteCaptured.innerHTML = this.chess.capturedPieces.white
            .map(piece => `<span class="captured-piece">${piece}</span>`).join('');
        
        blackCaptured.innerHTML = this.chess.capturedPieces.black
            .map(piece => `<span class="captured-piece">${piece}</span>`).join('');
    }

    checkGameEnd() {
        if (this.chess.isCheckmate()) {
            const winner = this.chess.currentTurn === 'white' ? 'Black' : 'White';
            this.showGameOver(`Checkmate! ${winner} wins!`);
        } else if (this.chess.isStalemate()) {
            this.showGameOver('Stalemate! It\'s a draw!');
        }
    }

    showGameOver(message) {
        document.getElementById('game-over-message').textContent = message;
        document.getElementById('game-over-modal').classList.add('active');
        this.gameActive = false;
    }

    newGame() {
        this.multiplayer.sendNewGame();
        this.resetGame();
    }

    resetGame() {
        this.chess = new Chess();
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.gameActive = true;
        this.updateDisplay();
        document.getElementById('game-over-modal').classList.remove('active');
        
        // Swap colors for new game
        if (this.playerColor) {
            this.playerColor = this.playerColor === 'white' ? 'black' : 'white';
            document.getElementById('color-display').textContent = this.playerColor;
        }
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
