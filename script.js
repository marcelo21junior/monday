document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskContainer = document.getElementById('taskContainer');
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    
    // Sistema centralizado de gerenciamento de timers
    const timerManager = {
        activeTimers: {},
        
        startTimer: function(subtaskId, subtask) {
            if (this.activeTimers[subtaskId]) {
                clearInterval(this.activeTimers[subtaskId].intervalId);
            }
            
            subtask.timer.isRunning = true;
            const startTime = Date.now() - (subtask.timer.time * 1000);
            
            const intervalId = setInterval(() => {
                const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                subtask.timer.time = elapsedTime;
                saveTasks();
                
                // Atualizar o display do timer se o elemento existir
                document.querySelectorAll(`.subtask-item[data-id="${subtaskId}"] .timer`).forEach(timerElement => {
                    timerElement.textContent = formatTime(subtask.timer.time);
                });
            }, 1000);
            
            this.activeTimers[subtaskId] = {
                intervalId: intervalId,
                subtask: subtask
            };
            
            return intervalId;
        },
        
        pauseTimer: function(subtaskId, subtask) {
            if (this.activeTimers[subtaskId]) {
                clearInterval(this.activeTimers[subtaskId].intervalId);
                delete this.activeTimers[subtaskId];
                subtask.timer.isRunning = false;
                saveTasks();
            }
        },
        
        resetTimer: function(subtaskId, subtask) {
            this.pauseTimer(subtaskId, subtask);
            subtask.timer.time = 0;
            saveTasks();
        },
        
        restoreTimers: function() {
            tasks.forEach(task => {
                task.subtasks.forEach(subtask => {
                    if (subtask.timer.isRunning) {
                        this.startTimer(subtask.id, subtask);
                    }
                });
            });
        }
    };
    
    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', task.id);
        card.innerHTML = `
            <div class="task-header">
                <span class="task-title">${task.title}</span>
                <div class="task-actions">
                    <button class="btn edit-btn" onclick="event.stopPropagation()">Editar</button>
                    <button class="btn delete-btn" onclick="event.stopPropagation()">Excluir</button>
                    <span class="arrow-icon down">▼</span>
                </div>
            </div>
            <div class="subtask-container" style="display: block;">
                <div class="subtasks-list"></div>
                <button class="add-subtask-btn">+ Adicionar Subtarefa</button>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${calculateProgress(task)}%"></div>
                <span class="progress-percentage">${Math.round(calculateProgress(task))}%</span>
            </div>
        `;

        // Eventos do card principal
        card.addEventListener('click', () => {
            const subtaskContainer = card.querySelector('.subtask-container');
            const arrowIcon = card.querySelector('.arrow-icon');
            
            subtaskContainer.style.display = subtaskContainer.style.display === 'none' ? 'block' : 'none';
            
            // Alternar o ícone de seta
            if (subtaskContainer.style.display === 'block') {
                arrowIcon.textContent = '▲';
                arrowIcon.classList.remove('down');
                arrowIcon.classList.add('up');
                renderSubtasks(task, card);
            } else {
                arrowIcon.textContent = '▼';
                arrowIcon.classList.remove('up');
                arrowIcon.classList.add('down');
            }
        });


        // Botão de editar tarefa principal
        card.querySelector('.edit-btn').addEventListener('click', () => {
            const newTitle = prompt('Digite o novo nome da tarefa:', task.title);
            if (newTitle && newTitle.trim()) {
                task.title = newTitle.trim();
                card.querySelector('.task-title').textContent = task.title;
                saveTasks();
            }
        });

        // Botão de excluir tarefa principal
        card.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                tasks = tasks.filter(t => t.id !== task.id);
                card.remove();
                saveTasks();
            }
        });

        // Botão de adicionar subtarefa
        card.querySelector('.add-subtask-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const subtaskTitle = prompt('Digite o nome da subtarefa:');
            if (subtaskTitle && subtaskTitle.trim()) {
                const subtask = {
                    id: Date.now(),
                    title: subtaskTitle.trim(),
                    completed: false,
                    timer: {
                        time: 0,
                        isRunning: false,
                        intervalId: null
                    }
                };
                task.subtasks.push(subtask);
                renderSubtasks(task, card);
                updateProgress(task, card);
                saveTasks();
            }
        });

        // Render subtasks immediately when card is created
        renderSubtasks(task, card);
        return card;
    }

    function renderSubtasks(task, card) {
        const subtasksList = card.querySelector('.subtasks-list');
        subtasksList.innerHTML = '';
        task.subtasks.forEach(subtask => {
            const subtaskElement = document.createElement('div');
            subtaskElement.className = 'subtask-item';
            subtaskElement.setAttribute('data-id', subtask.id);
            subtaskElement.innerHTML = `
                <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? 'checked' : ''} onclick="event.stopPropagation()">
                <span class="subtask-title ${subtask.completed ? 'completed' : ''}">${subtask.title}</span>
                <div class="timer-display">
                    <span class="timer">${formatTime(subtask.timer.time)}</span>
                    <button class="btn timer-btn ${subtask.timer.isRunning ? 'pause' : 'play'}">
                        ${subtask.timer.isRunning ? '⏸' : '▶'}
                    </button>
                    <button class="btn timer-reset">⟲</button>
                </div>
                <div class="task-actions">
                    <button class="btn edit-btn">Editar</button>
                    <button class="btn delete-btn">Excluir</button>
                </div>
            `;
            
            // Eventos do temporizador
            const playPauseBtn = subtaskElement.querySelector('.timer-btn');

            playPauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (subtask.timer.isRunning) {
                    timerManager.pauseTimer(subtask.id, subtask);
                    playPauseBtn.textContent = '▶';
                    playPauseBtn.classList.remove('pause');
                    playPauseBtn.classList.add('play');
                } else {
                    timerManager.startTimer(subtask.id, subtask);
                    playPauseBtn.textContent = '⏸';
                    playPauseBtn.classList.remove('play');
                    playPauseBtn.classList.add('pause');
                }
            });

            subtaskElement.querySelector('.timer-reset').addEventListener('click', (e) => {
                e.stopPropagation();
                timerManager.resetTimer(subtask.id, subtask);
                subtaskElement.querySelector('.timer').textContent = formatTime(0);
                playPauseBtn.textContent = '▶';
                playPauseBtn.classList.remove('pause');
                playPauseBtn.classList.add('play');
            });

            // Checkbox da subtarefa
            subtaskElement.querySelector('.subtask-checkbox').addEventListener('change', (e) => {
                e.stopPropagation();
                subtask.completed = e.target.checked;
                subtaskElement.querySelector('.subtask-title').classList.toggle('completed', subtask.completed);
                updateProgress(task, card);
                saveTasks();
            });

            // Botão de editar subtarefa
            subtaskElement.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const newTitle = prompt('Digite o novo nome da subtarefa:', subtask.title);
                if (newTitle && newTitle.trim()) {
                    subtask.title = newTitle.trim();
                    subtaskElement.querySelector('.subtask-title').textContent = subtask.title;
                    saveTasks();
                }
            });

            // Botão de excluir subtarefa
            subtaskElement.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Tem certeza que deseja excluir esta subtarefa?')) {
                    // Pausar o timer se estiver rodando antes de remover
                    if (subtask.timer.isRunning) {
                        timerManager.pauseTimer(subtask.id, subtask);
                    }
                    task.subtasks = task.subtasks.filter(st => st.id !== subtask.id);
                    subtaskElement.remove();
                    updateProgress(task, card);
                    saveTasks();
                }
            });

            subtasksList.appendChild(subtaskElement);
        });
    }

    function calculateProgress(task) {
        if (task.subtasks.length === 0) return 0;
        const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
        return (completedSubtasks / task.subtasks.length) * 100;
    }

    function updateProgress(task, card) {
        const progressFill = card.querySelector('.progress-fill');
        const progressPercentage = card.querySelector('.progress-percentage');
        const progress = calculateProgress(task);
        progressFill.style.width = `${progress}%`;
        progressPercentage.textContent = `${Math.round(progress)}%`;
    }

    // Adicionar nova tarefa
    addTaskBtn.addEventListener('click', () => {
        const title = taskInput.value.trim();
        if (title) {
            const task = {
                id: Date.now(),
                title: title,
                subtasks: []
            };
            tasks.push(task);
            taskContainer.appendChild(createTaskCard(task));
            taskInput.value = '';
            saveTasks();
        }
    });

    // Carregar tarefas salvas
    tasks.forEach(task => {
        taskContainer.appendChild(createTaskCard(task));
    });
    
    // Restaurar timers ativos após carregar a página
    timerManager.restoreTimers();
    
    // Implementação do sistema de arrastar e soltar para reordenar cards
    let draggedCard = null;
    let draggedCardIndex = -1;
    
    // Função para atualizar a ordem das tarefas no array e no localStorage
    function updateTasksOrder() {
        const cardElements = Array.from(taskContainer.querySelectorAll('.task-card'));
        const newTasksOrder = [];
        
        cardElements.forEach(card => {
            const taskId = parseInt(card.getAttribute('data-id'));
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                newTasksOrder.push(task);
            }
        });
        
        tasks = newTasksOrder;
        saveTasks();
    }
    
    // Adicionar eventos de arrastar e soltar aos cards
    taskContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-card')) {
            draggedCard = e.target;
            draggedCardIndex = Array.from(taskContainer.children).indexOf(draggedCard);
            setTimeout(() => {
                draggedCard.classList.add('dragging');
            }, 0);
        }
    });
    
    taskContainer.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task-card')) {
            e.target.classList.remove('dragging');
            draggedCard = null;
            draggedCardIndex = -1;
            updateTasksOrder();
        }
    });
    
    taskContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedCard) return;
        
        const cards = Array.from(taskContainer.querySelectorAll('.task-card:not(.dragging)'));
        const cardAfter = cards.find(card => {
            const cardRect = card.getBoundingClientRect();
            const cardMiddleY = cardRect.top + cardRect.height / 2;
            return e.clientY < cardMiddleY;
        });
        
        if (cardAfter) {
            taskContainer.insertBefore(draggedCard, cardAfter);
        } else {
            taskContainer.appendChild(draggedCard);
        }
    });
    
    // Prevenir o comportamento padrão de clique ao arrastar
    taskContainer.addEventListener('dragenter', (e) => e.preventDefault());
    taskContainer.addEventListener('dragleave', (e) => e.preventDefault());
    taskContainer.addEventListener('drop', (e) => e.preventDefault());
});