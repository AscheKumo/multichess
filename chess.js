class Chess {
    constructor() {
        this.board = this.initializeBoard();
        this.currentTurn = 'white';
        this.selectedPiece = null;
        this.capturedPieces = { white: [], black: [] };
        this.enPassantTarget = null;
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.kingPositions = { white: [7, 4], black: [0, 4] };
    }

    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Place pieces
        const pieces = {
            0: ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
            1: Array(8).fill('♟'),
            6: Array(8).fill('♙'),
            7: ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
        };
        
        for (const [row, rowPieces] of Object.entries(pieces)) {
            rowPieces.forEach((piece, col) => {
                const color = row < 2 ? 'black' : 'white';
                board[row][col] = { piece, color };
            });
        }
        
        return board;
    }

    getPieceType(piece) {
        const types = {
            '♔': 'king', '♚': 'king',
            '♕': 'queen', '♛': 'queen',
            '♖': 'rook', '♜': 'rook',
            '♗': 'bishop', '♝': 'bishop',
            '♘': 'knight', '♞': 'knight',
            '♙': 'pawn', '♟': 'pawn'
        };
        return types[piece] || null;
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        if (!piece || piece.color !== this.currentTurn) return false;
        
        const pieceType = this.getPieceType(piece.piece);
        const targetPiece = this.board[toRow][toCol];
        
        if (targetPiece && targetPiece.color === piece.color) return false;
        
        // Check basic move validity
        let isValid = false;
        
        switch (pieceType) {
            case 'pawn':
                isValid = this.isValidPawnMove(fromRow, fromCol, toRow, toCol, piece.color);
                break;
            case 'rook':
                isValid = this.isValidRookMove(fromRow, fromCol, toRow, toCol);
                break;
            case 'knight':
                isValid = this.isValidKnightMove(fromRow, fromCol, toRow, toCol);
                break;
            case 'bishop':
                isValid = this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
                break;
            case 'queen':
                isValid = this.isValidQueenMove(fromRow, fromCol, toRow, toCol);
                break;
            case 'king':
                isValid = this.isValidKingMove(fromRow, fromCol, toRow, toCol, piece.color);
                break;
        }
        
        if (!isValid) return false;
        
        // Check if move puts own king in check
        const tempBoard = this.cloneBoard();
        tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
        tempBoard[fromRow][fromCol] = null;
        
        if (pieceType === 'king') {
            const tempKingPos = { ...this.kingPositions };
            tempKingPos[piece.color] = [toRow, toCol];
            if (this.isKingInCheck(piece.color, tempBoard, tempKingPos)) return false;
        } else {
            if (this.isKingInCheck(piece.color, tempBoard)) return false;
        }
        
        return true;
    }

    isValidPawnMove(fromRow, fromCol, toRow, toCol, color) {
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);
        
        // Forward move
        if (colDiff === 0) {
            if (rowDiff === direction && !this.board[toRow][toCol]) return true;
            if (fromRow === startRow && rowDiff === 2 * direction && 
                !this.board[toRow][toCol] && !this.board[fromRow + direction][toCol]) return true;
        }
        
        // Diagonal capture
        if (colDiff === 1 && rowDiff === direction) {
            if (this.board[toRow][toCol] && this.board[toRow][toCol].color !== color) return true;
            // En passant
            if (this.enPassantTarget && this.enPassantTarget[0] === toRow && 
                this.enPassantTarget[1] === toCol) return true;
        }
        
        return false;
    }

    isValidRookMove(fromRow, fromCol, toRow, toCol) {
        if (fromRow !== toRow && fromCol !== toCol) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }

    isValidKnightMove(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }

    isValidBishopMove(fromRow, fromCol, toRow, toCol) {
        if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }

    isValidQueenMove(fromRow, fromCol, toRow, toCol) {
        return this.isValidRookMove(fromRow, fromCol, toRow, toCol) || 
               this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
    }

    isValidKingMove(fromRow, fromCol, toRow, toCol, color) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        // Normal king move
        if (rowDiff <= 1 && colDiff <= 1) return true;
        
        // Castling
        if (rowDiff === 0 && colDiff === 2) {
            if (this.isKingInCheck(color)) return false;
            
            const row = color === 'white' ? 7 : 0;
            if (fromRow !== row || fromCol !== 4) return false;
            
            if (toCol === 6 && this.castlingRights[color].kingside) {
                if (this.board[row][5] || this.board[row][6]) return false;
                if (this.isSquareUnderAttack(row, 5, color) || 
                    this.isSquareUnderAttack(row, 6, color)) return false;
                return true;
            }
            
            if (toCol === 2 && this.castlingRights[color].queenside) {
                if (this.board[row][1] || this.board[row][2] || this.board[row][3]) return false;
                if (this.isSquareUnderAttack(row, 2, color) || 
                    this.isSquareUnderAttack(row, 3, color)) return false;
                return true;
            }
        }
        
        return false;
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
        
        let row = fromRow + rowStep;
        let col = fromCol + colStep;
        
        while (row !== toRow || col !== toCol) {
            if (this.board[row][col]) return false;
            row += rowStep;
            col += colStep;
        }
        
        return true;
    }

    isSquareUnderAttack(row, col, byColor) {
        const enemyColor = byColor === 'white' ? 'black' : 'white';
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === enemyColor) {
                    const tempTurn = this.currentTurn;
                    this.currentTurn = enemyColor;
                    const canAttack = this.isValidMove(r, c, row, col);
                    this.currentTurn = tempTurn;
                    if (canAttack) return true;
                }
            }
        }
        
        return false;
    }

    isKingInCheck(color, board = this.board, kingPos = this.kingPositions) {
        const [kingRow, kingCol] = kingPos[color];
        return this.isSquareUnderAttack(kingRow, kingCol, color);
    }

    getPossibleMoves(row, col) {
        const moves = [];
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isValidMove(row, col, r, c)) {
                    moves.push([r, c]);
                }
            }
        }
        
        return moves;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        if (!this.isValidMove(fromRow, fromCol, toRow, toCol)) return false;
        
        const piece = this.board[fromRow][fromCol];
        const targetPiece = this.board[toRow][toCol];
        const pieceType = this.getPieceType(piece.piece);
        
        // Handle captures
        if (targetPiece) {
            this.capturedPieces[targetPiece.color].push(targetPiece.piece);
        }
        
        // Handle en passant capture
        if (pieceType === 'pawn' && this.enPassantTarget && 
            this.enPassantTarget[0] === toRow && this.enPassantTarget[1] === toCol) {
            const capturedRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
            const capturedPawn = this.board[capturedRow][toCol];
            this.capturedPieces[capturedPawn.color].push(capturedPawn.piece);
            this.board[capturedRow][toCol] = null;
        }
        
        // Update en passant target
        this.enPassantTarget = null;
        if (pieceType === 'pawn' && Math.abs(toRow - fromRow) === 2) {
            const enPassantRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
            this.enPassantTarget = [enPassantRow, toCol];
        }
        
        // Handle castling
        if (pieceType === 'king' && Math.abs(toCol - fromCol) === 2) {
            const row = piece.color === 'white' ? 7 : 0;
            if (toCol === 6) {
                this.board[row][5] = this.board[row][7];
                this.board[row][7] = null;
            } else if (toCol === 2) {
                this.board[row][3] = this.board[row][0];
                this.board[row][0] = null;
            }
        }
        
        // Update castling rights
        if (pieceType === 'king') {
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
            this.kingPositions[piece.color] = [toRow, toCol];
        }
        if (pieceType === 'rook') {
            if (fromRow === 0 && fromCol === 0) this.castlingRights.black.queenside = false;
            if (fromRow === 0 && fromCol === 7) this.castlingRights.black.kingside = false;
            if (fromRow === 7 && fromCol === 0) this.castlingRights.white.queenside = false;
            if (fromRow === 7 && fromCol === 7) this.castlingRights.white.kingside = false;
        }
        
        // Move piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Handle pawn promotion
        if (pieceType === 'pawn' && (toRow === 0 || toRow === 7)) {
            const queenPiece = piece.color === 'white' ? '♕' : '♛';
            this.board[toRow][toCol].piece = queenPiece;
        }
        
        // Switch turns
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        
        return true;
    }

    isCheckmate() {
        if (!this.isKingInCheck(this.currentTurn)) return false;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.currentTurn) {
                    const moves = this.getPossibleMoves(row, col);
                    if (moves.length > 0) return false;
                }
            }
        }
        
        return true;
    }

    isStalemate() {
        if (this.isKingInCheck(this.currentTurn)) return false;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.currentTurn) {
                    const moves = this.getPossibleMoves(row, col);
                    if (moves.length > 0) return false;
                }
            }
        }
        
        return true;
    }

    cloneBoard() {
        return this.board.map(row => 
            row.map(cell => cell ? { ...cell } : null)
        );
    }
}
