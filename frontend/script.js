
const API_URL = 'https://two-do-backend-pbuf.onrender.com/api/tasks';

const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskarea = document.getElementById('taskarea');
const sortBtn = document.getElementById('sortBtn');

// Sort state: 'newest' (default) or 'oldest'
let sortOrder = 'newest';

// Load tasks when the page opens
document.addEventListener('DOMContentLoaded', loadTasks);

// Toggle sort order
sortBtn.addEventListener('click', () => {
    sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
    const arrow = sortBtn.querySelector('.sort-arrow');
    arrow.textContent = sortOrder === 'newest' ? '↓' : '↑';
    sortBtn.setAttribute('aria-label', sortOrder === 'newest' ? 'Sort oldest first' : 'Sort newest first');
    loadTasks();
});

// Add a new task
addTaskBtn.addEventListener('click', addTask);

// Allow Enter to submit a task (Shift+Enter for new line)
taskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        addTask();
    }
});

async function loadTasks() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error('Failed to load tasks');
        }

        const tasks = await response.json();

        // Sort based on current sort order
        if (sortOrder === 'oldest') {
            tasks.reverse();
        }

        taskarea.replaceChildren();
        tasks.forEach(renderTask);
    } catch (error) {
        console.error('Error loading tasks:', error);
        showMessage('Could not load tasks. Check your server.');
    }
}

async function addTask(event) {
    if (event) event.preventDefault();

    const text = taskInput.value.trim();

    if (!text) {
        taskInput.focus();
        return;
    }

    addTaskBtn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        const savedTask = await response.json();

        if (!response.ok) {
            throw new Error(savedTask.message || 'Failed to add task');
        }

        // Clear the empty-state message if present
        const message = taskarea.querySelector('.empty-message');
        if (message) message.remove();

        renderTask(savedTask, true);
        taskInput.value = '';
        taskInput.focus();
    } catch (error) {
        console.error('Error adding task:', error);
        alert(error.message || 'Could not connect to the server.');
    } finally {
        addTaskBtn.disabled = false;
    }
}

function renderTask(task, prepend = false) {
    const taskElement = document.createElement('div');
    taskElement.classList.add('task');
    taskElement.dataset.id = task._id;

    if (task.completed) {
        taskElement.classList.add('completed');
    }

    // Completion button
    const completeBtn = document.createElement('button');
    completeBtn.type = 'button';
    completeBtn.className = 'task-check';
    completeBtn.setAttribute(
        'aria-label',
        task.completed ? 'Mark task incomplete' : 'Mark task complete'
    );

    const checkImg = document.createElement('img');
    checkImg.src = task.completed
        ? './assets/images/check.svg'
        : './assets/images/uncheck.svg';
    checkImg.alt = '';
    completeBtn.appendChild(checkImg);

    completeBtn.addEventListener('click', () => {
        toggleTask(task, taskElement, checkImg, completeBtn);
    });

    // Task text
    const taskText = document.createElement('p');
    taskText.className = 'task-text';
    taskText.textContent = task.text;

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'task-delete';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);

    deleteBtn.addEventListener('click', () => {
        deleteTask(task._id, taskElement, deleteBtn);
    });

    taskElement.append(completeBtn, taskText, deleteBtn);

    if (prepend) {
        taskarea.prepend(taskElement);
    } else {
        taskarea.appendChild(taskElement);
    }
}

// Toggle task completion
async function toggleTask(task, element, image, button) {
    button.disabled = true;

    try {
        const response = await fetch(`${API_URL}/${task._id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed: !task.completed })
        });

        const updatedTask = await response.json();

        if (!response.ok) {
            throw new Error(updatedTask.message || 'Failed to update task');
        }

        task.completed = updatedTask.completed;
        element.classList.toggle('completed', task.completed);

        image.src = task.completed
            ? './assets/images/check.svg'
            : './assets/images/uncheck.svg';

        button.setAttribute(
            'aria-label',
            task.completed ? 'Mark task incomplete' : 'Mark task complete'
        );
    } catch (error) {
        console.error('Error updating task:', error);
        alert(error.message || 'Could not update task.');
    } finally {
        button.disabled = false;
    }
}

// Delete task
async function deleteTask(id, element, button) {
    const confirmed = await showConfirmModal('Are you sure you want to delete this task?');
    if (!confirmed) return;

    button.disabled = true;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete task');
        }

        element.remove();
        showEmptyState();
    } catch (error) {
        console.error('Error deleting task:', error);
        showAlertModal(error.message || 'Could not delete task.');
    } finally {
        button.disabled = false;
    }
}

// Custom in-app confirmation modal (replaces browser confirm)
function showConfirmModal(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal-box';

        const msg = document.createElement('p');
        msg.className = 'modal-message';
        msg.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'modal-btn modal-cancel';
        cancelBtn.textContent = 'Cancel';

        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'modal-btn modal-confirm';
        confirmBtn.textContent = 'Delete';

        function close(result) {
            overlay.remove();
            resolve(result);
        }

        cancelBtn.addEventListener('click', () => close(false));
        confirmBtn.addEventListener('click', () => close(true));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(false);
        });

        // Allow Escape to dismiss
        function onKey(e) {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', onKey);
                close(false);
            }
        }
        document.addEventListener('keydown', onKey);

        actions.append(cancelBtn, confirmBtn);
        modal.append(msg, actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        confirmBtn.focus();
    });
}

// Custom in-app alert modal (replaces browser alert)
function showAlertModal(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal-box';

        const msg = document.createElement('p');
        msg.className = 'modal-message';
        msg.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        const okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.className = 'modal-btn modal-cancel';
        okBtn.textContent = 'OK';

        function close() {
            overlay.remove();
            resolve();
        }

        okBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        function onKey(e) {
            if (e.key === 'Escape' || e.key === 'Enter') {
                document.removeEventListener('keydown', onKey);
                close();
            }
        }
        document.addEventListener('keydown', onKey);

        actions.appendChild(okBtn);
        modal.append(msg, actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        okBtn.focus();
    });
}

function showEmptyState() {
    if (taskarea.querySelector('.task')) return;

    showMessage('No tasks yet.');
}

function showMessage(message) {
    const existing = taskarea.querySelector('.empty-message');
    if (existing) existing.remove();

    const messageElement = document.createElement('p');
    messageElement.className = 'empty-message';
    messageElement.textContent = message;

    taskarea.appendChild(messageElement);
}
