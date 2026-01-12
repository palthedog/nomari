/**
 * Main Application Logic
 * Manages UI interactions and game data
 */

class FightingGameApp {
    constructor() {
        this.gameData = {
            states: {}
        };
        this.selectedState = null;
        this.selectedP1Move = null;
        this.selectedP2Move = null;
        this.init();
    }

    init() {
        // State management
        document.getElementById('add-state-btn').addEventListener('click', () => this.addState());
        document.getElementById('state-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addState();
        });

        // Move management
        document.getElementById('add-p1-move-btn').addEventListener('click', () => this.addMove(1));
        document.getElementById('add-p2-move-btn').addEventListener('click', () => this.addMove(2));
        document.getElementById('p1-move-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addMove(1);
        });
        document.getElementById('p2-move-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addMove(2);
        });

        // Outcome management
        document.getElementById('save-outcome-btn').addEventListener('click', () => this.saveOutcome());

        // Solver
        document.getElementById('run-solver-btn').addEventListener('click', () => this.runSolver());

        // Load example data
        this.loadExampleData();
    }

    loadExampleData() {
        // Add example states
        this.addStateData('Knockdown', 'knockdown');
        this.addStateData('Neutral', 'neutral');

        // Select the first state
        this.selectState('knockdown');

        // Add moves for Player 1
        this.addMoveData(1, 'Meaty Attack', 'knockdown', 'meaty');
        this.addMoveData(1, 'Throw', 'knockdown', 'throw');
        this.addMoveData(1, 'Block', 'knockdown', 'block');

        // Add moves for Player 2
        this.addMoveData(2, 'Wakeup DP', 'knockdown', 'dp');
        this.addMoveData(2, 'Block', 'knockdown', 'p2block');
        this.addMoveData(2, 'Throw Tech', 'knockdown', 'tech');

        // Set up some example outcomes
        const outcomes = {
            'meaty_dp': { reward: -50, nextState: '' },
            'meaty_p2block': { reward: 20, nextState: 'neutral' },
            'meaty_tech': { reward: 30, nextState: 'neutral' },
            'throw_dp': { reward: 100, nextState: '' },
            'throw_p2block': { reward: -30, nextState: 'neutral' },
            'throw_tech': { reward: 0, nextState: 'neutral' },
            'block_dp': { reward: -100, nextState: '' },
            'block_p2block': { reward: 0, nextState: 'neutral' },
            'block_tech': { reward: 10, nextState: 'neutral' }
        };

        this.gameData.states['knockdown'].outcomes = outcomes;

        this.renderStates();
        this.renderMoves();
    }

    generateId(name) {
        return name.toLowerCase().replace(/\s+/g, '-');
    }

    addState() {
        const input = document.getElementById('state-name-input');
        const name = input.value.trim();
        
        if (!name) {
            this.showError('Please enter a state name');
            return;
        }

        const id = this.generateId(name);
        
        if (this.gameData.states[id]) {
            this.showError('State already exists');
            return;
        }

        this.addStateData(name, id);
        this.renderStates();
        input.value = '';
    }

    addStateData(name, id) {
        this.gameData.states[id] = {
            name: name,
            id: id,
            p1Moves: [],
            p2Moves: [],
            outcomes: {}
        };
    }

    deleteState(stateId) {
        if (confirm(`Delete state "${this.gameData.states[stateId].name}"?`)) {
            delete this.gameData.states[stateId];
            if (this.selectedState === stateId) {
                this.selectedState = null;
                document.getElementById('move-editor').style.display = 'none';
                document.getElementById('no-state-selected').style.display = 'block';
            }
            this.renderStates();
        }
    }

    selectState(stateId) {
        this.selectedState = stateId;
        this.selectedP1Move = null;
        this.selectedP2Move = null;
        
        document.getElementById('no-state-selected').style.display = 'none';
        document.getElementById('move-editor').style.display = 'block';
        document.getElementById('move-outcomes-section').style.display = 'none';
        document.getElementById('selected-state-name').textContent = 
            `State: ${this.gameData.states[stateId].name}`;
        
        this.renderStates();
        this.renderMoves();
        this.updateNextStateOptions();
    }

    addMove(player) {
        if (!this.selectedState) {
            this.showError('Please select a state first');
            return;
        }

        const inputId = player === 1 ? 'p1-move-name' : 'p2-move-name';
        const input = document.getElementById(inputId);
        const name = input.value.trim();

        if (!name) {
            this.showError('Please enter a move name');
            return;
        }

        const id = this.generateId(name);
        this.addMoveData(player, name, this.selectedState, id);
        this.renderMoves();
        input.value = '';
    }

    addMoveData(player, name, stateId, id) {
        const movesKey = player === 1 ? 'p1Moves' : 'p2Moves';
        const state = this.gameData.states[stateId];
        
        if (state[movesKey].find(m => m.id === id)) {
            return; // Move already exists
        }

        state[movesKey].push({ name, id });
    }

    deleteMove(player, moveId) {
        if (!this.selectedState) return;

        const state = this.gameData.states[this.selectedState];
        const movesKey = player === 1 ? 'p1Moves' : 'p2Moves';
        
        state[movesKey] = state[movesKey].filter(m => m.id !== moveId);
        this.renderMoves();
    }

    selectMoveForOutcome(player, moveId) {
        if (player === 1) {
            this.selectedP1Move = moveId;
        } else {
            this.selectedP2Move = moveId;
        }

        this.renderMoves();

        if (this.selectedP1Move && this.selectedP2Move) {
            this.showOutcomeEditor();
        }
    }

    showOutcomeEditor() {
        const state = this.gameData.states[this.selectedState];
        const p1Move = state.p1Moves.find(m => m.id === this.selectedP1Move);
        const p2Move = state.p2Moves.find(m => m.id === this.selectedP2Move);

        document.getElementById('current-move-combo').textContent = 
            `${p1Move.name} vs ${p2Move.name}`;
        document.getElementById('move-outcomes-section').style.display = 'block';

        // Load existing outcome if it exists
        const outcomeKey = `${this.selectedP1Move}_${this.selectedP2Move}`;
        const outcome = state.outcomes[outcomeKey] || { reward: 0, nextState: '' };

        document.getElementById('outcome-reward').value = outcome.reward;
        document.getElementById('outcome-next-state').value = outcome.nextState;
    }

    saveOutcome() {
        if (!this.selectedState || !this.selectedP1Move || !this.selectedP2Move) {
            return;
        }

        const state = this.gameData.states[this.selectedState];
        const outcomeKey = `${this.selectedP1Move}_${this.selectedP2Move}`;
        
        const reward = parseFloat(document.getElementById('outcome-reward').value);
        const nextState = document.getElementById('outcome-next-state').value;

        state.outcomes[outcomeKey] = {
            reward: reward,
            nextState: nextState
        };

        this.showSuccess('Outcome saved successfully!');
        this.selectedP1Move = null;
        this.selectedP2Move = null;
        document.getElementById('move-outcomes-section').style.display = 'none';
        this.renderMoves();
    }

    showError(message) {
        // Create temporary error notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showSuccess(message) {
        // Create temporary success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    updateNextStateOptions() {
        const select = document.getElementById('outcome-next-state');
        select.innerHTML = '<option value="">Terminal (game ends)</option>';

        for (const stateId in this.gameData.states) {
            const option = document.createElement('option');
            option.value = stateId;
            option.textContent = this.gameData.states[stateId].name;
            select.appendChild(option);
        }
    }

    renderStates() {
        const container = document.getElementById('states-list');
        container.innerHTML = '';

        for (const stateId in this.gameData.states) {
            const state = this.gameData.states[stateId];
            const item = document.createElement('div');
            item.className = 'state-item';
            if (this.selectedState === stateId) {
                item.classList.add('selected');
            }

            const nameDiv = document.createElement('div');
            nameDiv.className = 'state-item-name';
            nameDiv.textContent = state.name;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'state-item-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteState(stateId);
            };

            actionsDiv.appendChild(deleteBtn);

            item.appendChild(nameDiv);
            item.appendChild(actionsDiv);
            item.onclick = () => this.selectState(stateId);

            container.appendChild(item);
        }
    }

    renderMoves() {
        if (!this.selectedState) return;

        const state = this.gameData.states[this.selectedState];

        // Render Player 1 moves
        this.renderMovesList('p1-moves-list', state.p1Moves, 1);

        // Render Player 2 moves
        this.renderMovesList('p2-moves-list', state.p2Moves, 2);
    }

    renderMovesList(containerId, moves, player) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        moves.forEach(move => {
            const item = document.createElement('div');
            item.className = 'move-item';

            const selectedMove = player === 1 ? this.selectedP1Move : this.selectedP2Move;
            if (selectedMove === move.id) {
                item.style.background = '#d0e7ff';
                item.style.borderColor = '#2196f3';
            }

            const nameDiv = document.createElement('div');
            nameDiv.className = 'move-item-name';
            nameDiv.textContent = move.name;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'move-item-actions';

            const selectBtn = document.createElement('button');
            selectBtn.className = 'btn btn-edit';
            selectBtn.textContent = 'Select';
            selectBtn.onclick = () => this.selectMoveForOutcome(player, move.id);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => this.deleteMove(player, move.id);

            actionsDiv.appendChild(selectBtn);
            actionsDiv.appendChild(deleteBtn);

            item.appendChild(nameDiv);
            item.appendChild(actionsDiv);

            container.appendChild(item);
        });
    }

    runSolver() {
        const iterations = parseInt(document.getElementById('solver-iterations').value);
        const statusDiv = document.getElementById('solver-status');
        const resultsDiv = document.getElementById('solver-results');

        statusDiv.textContent = 'Running CFR solver...';
        resultsDiv.innerHTML = '';

        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
            try {
                const solver = new CFRSolver(this.gameData);
                const startState = this.selectedState || Object.keys(this.gameData.states)[0];
                
                if (!startState) {
                    throw new Error('No states defined');
                }

                const results = solver.train(iterations, startState);
                
                statusDiv.textContent = `Solver completed ${iterations} iterations successfully!`;
                statusDiv.style.background = '#d4edda';
                statusDiv.style.borderColor = '#28a745';
                statusDiv.style.color = '#155724';
                
                this.displayResults(results);
            } catch (error) {
                statusDiv.textContent = `Error: ${error.message}`;
                statusDiv.style.background = '#f8d7da';
                statusDiv.style.borderColor = '#dc3545';
                statusDiv.style.color = '#721c24';
            }
        });
    }

    displayResults(results) {
        const resultsDiv = document.getElementById('solver-results');
        resultsDiv.innerHTML = '';

        for (const stateId in results) {
            const stateResult = results[stateId];
            const state = this.gameData.states[stateId];

            if (!state) continue;

            const stateDiv = document.createElement('div');
            stateDiv.className = 'result-state';

            const title = document.createElement('h4');
            title.textContent = `Optimal Strategy for: ${state.name}`;
            stateDiv.appendChild(title);

            // Player 1 strategy
            if (stateResult.p1 && stateResult.p1.length > 0) {
                const p1Title = document.createElement('h5');
                p1Title.textContent = 'Player 1 Strategy:';
                p1Title.style.marginTop = '15px';
                p1Title.style.marginBottom = '10px';
                stateDiv.appendChild(p1Title);

                const table = this.createStrategyTable(stateResult.p1);
                stateDiv.appendChild(table);
            }

            // Player 2 strategy
            if (stateResult.p2 && stateResult.p2.length > 0) {
                const p2Title = document.createElement('h5');
                p2Title.textContent = 'Player 2 Strategy:';
                p2Title.style.marginTop = '15px';
                p2Title.style.marginBottom = '10px';
                stateDiv.appendChild(p2Title);

                const table = this.createStrategyTable(stateResult.p2);
                stateDiv.appendChild(table);
            }

            resultsDiv.appendChild(stateDiv);
        }
    }

    createStrategyTable(strategy) {
        const table = document.createElement('table');
        table.className = 'strategy-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const th1 = document.createElement('th');
        th1.textContent = 'Move';
        const th2 = document.createElement('th');
        th2.textContent = 'Probability';
        
        headerRow.appendChild(th1);
        headerRow.appendChild(th2);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        
        strategy.forEach(item => {
            const row = document.createElement('tr');
            
            const moveCell = document.createElement('td');
            moveCell.textContent = item.moveName;
            
            const probCell = document.createElement('td');
            const probDiv = document.createElement('div');
            probDiv.className = 'probability-bar';
            
            const barContainer = document.createElement('div');
            barContainer.className = 'bar-container';
            
            const barFill = document.createElement('div');
            barFill.className = 'bar-fill';
            barFill.style.width = `${item.probability * 100}%`;
            
            barContainer.appendChild(barFill);
            
            const probValue = document.createElement('span');
            probValue.className = 'probability-value';
            probValue.textContent = `${(item.probability * 100).toFixed(1)}%`;
            
            probDiv.appendChild(barContainer);
            probDiv.appendChild(probValue);
            probCell.appendChild(probDiv);
            
            row.appendChild(moveCell);
            row.appendChild(probCell);
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        return table;
    }
}

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FightingGameApp();
});
