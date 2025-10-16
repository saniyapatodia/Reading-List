// ADHD-Friendly Reading List App
class ReadingListApp {
    constructor() {
        this.books = this.loadBooks();
        this.currentView = 'grid';
        this.focusMode = false;
        this.currentTheme = 'vibrant';
        this.editingBookId = null;
        this.currentProgressBookId = null;
        this.streakData = this.loadStreakData();
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
        this.updateStats();
        this.updateStreak();
        this.renderStreakCalendar();
    }

    bindEvents() {
        // Add book button
        document.getElementById('addBookBtn').addEventListener('click', () => this.showAddBookModal());
        document.getElementById('addFirstBookBtn').addEventListener('click', () => this.showAddBookModal());

        // Modal events
        document.getElementById('modalClose').addEventListener('click', () => this.hideBookModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.hideBookModal());
        document.getElementById('bookModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideBookModal();
        });

        // Progress modal events
        document.getElementById('progressModalClose').addEventListener('click', () => this.hideProgressModal());
        document.getElementById('progressModalCancel').addEventListener('click', () => this.hideProgressModal());
        document.getElementById('progressModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideProgressModal();
        });

        // Form submissions
        document.getElementById('bookForm').addEventListener('submit', (e) => this.handleBookSubmit(e));
        document.getElementById('progressForm').addEventListener('submit', (e) => this.handleProgressSubmit(e));

        // Filter and sort
        document.getElementById('statusFilter').addEventListener('change', () => this.render());
        document.getElementById('pageFilter').addEventListener('change', () => this.render());
        document.getElementById('sortBy').addEventListener('change', () => this.render());

        // View controls
        document.getElementById('gridViewBtn').addEventListener('click', () => this.setView('grid'));
        document.getElementById('listViewBtn').addEventListener('click', () => this.setView('list'));

        // Focus mode
        document.getElementById('focusModeBtn').addEventListener('click', () => this.toggleFocusMode());

        // Theme switcher
        document.getElementById('themeBtn').addEventListener('click', () => this.toggleThemeDropdown());
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => this.changeTheme(e.target.closest('.theme-option').dataset.theme));
        });

        // Close theme dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.theme-switcher')) {
                document.getElementById('themeDropdown').classList.remove('active');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    handleKeyboardShortcuts(e) {
        // Escape to close modals
        if (e.key === 'Escape') {
            this.hideBookModal();
            this.hideProgressModal();
        }
        
        // Ctrl/Cmd + N to add new book
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showAddBookModal();
        }
        
        // Ctrl/Cmd + F to toggle focus mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.toggleFocusMode();
        }
        
        // Ctrl/Cmd + T to cycle themes
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            this.cycleTheme();
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    createBook(data) {
        return {
            id: this.generateId(),
            title: data.title.trim(),
            author: data.author.trim(),
            genre: data.genre || '',
            pages: parseInt(data.pages) || 0,
            status: data.status || 'to-read',
            priority: data.priority || 'medium',
            notes: data.notes || '',
            coverUrl: data.coverUrl || '',
            currentPage: 0,
            progressNotes: '',
            dateAdded: new Date().toISOString(),
            dateCompleted: null
        };
    }

    loadBooks() {
        const saved = localStorage.getItem('readingListBooks');
        return saved ? JSON.parse(saved) : [];
    }

    saveBooks() {
        localStorage.setItem('readingListBooks', JSON.stringify(this.books));
    }

    loadStreakData() {
        const saved = localStorage.getItem('readingListStreak');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            currentStreak: 0,
            longestStreak: 0,
            readingDays: [], // Array of dates when user read
            lastReadingDate: null
        };
    }

    saveStreakData() {
        localStorage.setItem('readingListStreak', JSON.stringify(this.streakData));
    }

    addBook(bookData) {
        const book = this.createBook(bookData);
        this.books.unshift(book);
        this.saveBooks();
        this.render();
        this.updateStats();
        this.hideBookModal();
        this.showNotification('Book added successfully!', 'success');
    }

    updateBook(id, bookData) {
        const index = this.books.findIndex(book => book.id === id);
        if (index !== -1) {
            this.books[index] = { ...this.books[index], ...bookData };
            this.saveBooks();
            this.render();
            this.updateStats();
            this.hideBookModal();
            this.showNotification('Book updated successfully!', 'success');
        }
    }

    deleteBook(id) {
        if (confirm('Are you sure you want to delete this book?')) {
            this.books = this.books.filter(book => book.id !== id);
            this.saveBooks();
            this.render();
            this.updateStats();
            this.showNotification('Book deleted successfully!', 'info');
        }
    }

    updateProgress(id, progressData) {
        const book = this.books.find(book => book.id === id);
        if (book) {
            const oldPage = book.currentPage;
            book.currentPage = parseInt(progressData.currentPage);
            book.progressNotes = progressData.progressNotes || '';
            
            // Auto-update status based on progress
            if (book.currentPage >= book.pages && book.pages > 0) {
                book.status = 'completed';
                book.dateCompleted = new Date().toISOString();
            } else if (book.currentPage > 0) {
                book.status = 'reading';
            }
            
            // Track reading activity for streaks
            if (book.currentPage > oldPage) {
                this.recordReadingActivity();
            }
            
            this.saveBooks();
            this.render();
            this.updateStats();
            this.updateStreak();
            this.renderStreakCalendar();
            this.hideProgressModal();
            this.showNotification('Progress updated successfully!', 'success');
        }
    }

    getFilteredAndSortedBooks() {
        let filtered = [...this.books];
        
        // Filter by status
        const statusFilter = document.getElementById('statusFilter').value;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(book => book.status === statusFilter);
        }
        
        // Filter by page count
        const pageFilter = document.getElementById('pageFilter').value;
        if (pageFilter !== 'all') {
            filtered = filtered.filter(book => {
                if (!book.pages || book.pages === 0) return false;
                
                switch (pageFilter) {
                    case 'short':
                        return book.pages >= 1 && book.pages <= 200;
                    case 'medium':
                        return book.pages >= 201 && book.pages <= 400;
                    case 'long':
                        return book.pages >= 401;
                    default:
                        return true;
                }
            });
        }
        
        // Sort books
        const sortBy = document.getElementById('sortBy').value;
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'author':
                    return a.author.localeCompare(b.author);
                case 'date-added':
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
                case 'priority':
                    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'pages':
                    return (b.pages || 0) - (a.pages || 0);
                default:
                    return 0;
            }
        });
        
        return filtered;
    }

    render() {
        const booksContainer = document.getElementById('booksContainer');
        const emptyState = document.getElementById('emptyState');
        const filteredBooks = this.getFilteredAndSortedBooks();
        
        if (filteredBooks.length === 0) {
            booksContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        booksContainer.style.display = 'grid';
        emptyState.style.display = 'none';
        
        booksContainer.className = `books-container ${this.currentView}-view`;
        
        booksContainer.innerHTML = filteredBooks.map(book => this.renderBook(book)).join('');
        
        // Bind events for each book card
        filteredBooks.forEach(book => {
            document.getElementById(`edit-${book.id}`).addEventListener('click', () => this.editBook(book.id));
            document.getElementById(`delete-${book.id}`).addEventListener('click', () => this.deleteBook(book.id));
            document.getElementById(`progress-${book.id}`).addEventListener('click', () => this.showProgressModal(book.id));
        });
    }

    renderBook(book) {
        const progressPercentage = book.pages > 0 ? Math.round((book.currentPage / book.pages) * 100) : 0;
        
        return `
            <div class="book-card" data-id="${book.id}">
                <div class="book-cover">
                    ${book.coverUrl ? 
                        `<img src="${book.coverUrl}" alt="${book.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="book-cover-placeholder" style="display: none;">
                             <i class="fas fa-book"></i>
                         </div>` :
                        `<div class="book-cover-placeholder">
                             <i class="fas fa-book"></i>
                         </div>`
                    }
                </div>
                <div class="book-info">
                    <h3 class="book-title">${this.escapeHtml(book.title)}</h3>
                    <p class="book-author">by ${this.escapeHtml(book.author)}</p>
                    
                    <div class="book-meta">
                        <span class="book-status ${book.status}">${this.getStatusText(book.status)}</span>
                        <span class="book-priority ${book.priority}">${book.priority}</span>
                        ${book.genre ? `<span class="book-genre">${this.escapeHtml(book.genre)}</span>` : ''}
                    </div>
                    
                    ${book.pages > 0 ? `
                        <div class="book-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                            </div>
                            <div class="progress-text">${book.currentPage} / ${book.pages} pages (${progressPercentage}%)</div>
                        </div>
                    ` : ''}
                    
                    ${book.notes ? `<p class="book-notes">${this.escapeHtml(book.notes)}</p>` : ''}
                    
                    <div class="book-actions">
                        <button class="book-action-btn" id="progress-${book.id}" title="Update Progress">
                            <i class="fas fa-chart-line"></i>
                            Progress
                        </button>
                        <button class="book-action-btn" id="edit-${book.id}" title="Edit Book">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        <button class="book-action-btn danger" id="delete-${book.id}" title="Delete Book">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        const statusMap = {
            'to-read': 'To Read',
            'reading': 'Reading',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats() {
        const totalBooks = this.books.length;
        const inProgressBooks = this.books.filter(book => book.status === 'reading').length;
        const completedBooks = this.books.filter(book => book.status === 'completed').length;
        
        document.getElementById('totalBooks').textContent = totalBooks;
        document.getElementById('inProgressBooks').textContent = inProgressBooks;
        document.getElementById('completedBooks').textContent = completedBooks;
        document.getElementById('currentStreak').textContent = this.streakData.currentStreak;
    }

    recordReadingActivity() {
        const today = new Date().toDateString();
        
        // Don't record if already recorded today
        if (this.streakData.readingDays.includes(today)) {
            return;
        }
        
        this.streakData.readingDays.push(today);
        this.streakData.lastReadingDate = today;
        this.updateStreak();
        this.saveStreakData();
    }

    updateStreak() {
        const today = new Date();
        const todayString = today.toDateString();
        
        // Sort reading days to get the most recent streak
        const sortedDays = this.streakData.readingDays
            .map(date => new Date(date))
            .sort((a, b) => b - a);
        
        let currentStreak = 0;
        let checkDate = new Date(today);
        
        // Check if user read today
        if (this.streakData.readingDays.includes(todayString)) {
            currentStreak = 1;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        // Count consecutive days going backwards
        for (let day of sortedDays) {
            if (day.toDateString() === checkDate.toDateString()) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        this.streakData.currentStreak = currentStreak;
        this.streakData.longestStreak = Math.max(this.streakData.longestStreak, currentStreak);
        
        // Update UI
        document.getElementById('currentStreak').textContent = currentStreak;
        document.getElementById('streakDays').textContent = currentStreak;
        document.getElementById('longestStreak').textContent = this.streakData.longestStreak;
        
        this.updateStreakMotivation();
    }

    updateStreakMotivation() {
        const motivation = document.getElementById('streakMotivation');
        const streak = this.streakData.currentStreak;
        
        let message = '';
        let className = '';
        
        if (streak === 0) {
            message = 'Start your reading journey today! 📚';
            className = '';
        } else if (streak === 1) {
            message = 'Great start! Keep the momentum going! 🔥';
            className = 'encouraging';
        } else if (streak < 7) {
            message = `${streak} days strong! You\'re building a great habit! 💪`;
            className = 'encouraging';
        } else if (streak < 30) {
            message = `Amazing ${streak}-day streak! You\'re on fire! 🔥🔥`;
            className = 'encouraging';
        } else {
            message = `Incredible ${streak}-day streak! You\'re a reading champion! 🏆`;
            className = 'encouraging';
        }
        
        motivation.innerHTML = `<p>${message}</p>`;
        motivation.className = `streak-motivation ${className}`;
    }

    renderStreakCalendar() {
        const calendar = document.getElementById('streakCalendar');
        const today = new Date();
        
        // Get the last 35 days (5 weeks)
        const days = [];
        for (let i = 34; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        
        calendar.innerHTML = days.map(date => {
            const dateString = date.toDateString();
            const isToday = dateString === today.toDateString();
            const hasRead = this.streakData.readingDays.includes(dateString);
            
            let className = 'calendar-day';
            if (hasRead) className += ' read';
            if (isToday) className += ' today';
            
            return `
                <div class="${className}" title="${date.toLocaleDateString()}">
                    ${date.getDate()}
                </div>
            `;
        }).join('');
    }

    showAddBookModal() {
        this.editingBookId = null;
        document.getElementById('modalTitle').textContent = 'Add New Book';
        document.getElementById('bookForm').reset();
        document.getElementById('bookModalOverlay').classList.add('active');
        document.getElementById('bookTitle').focus();
    }

    editBook(id) {
        const book = this.books.find(book => book.id === id);
        if (book) {
            this.editingBookId = id;
            document.getElementById('modalTitle').textContent = 'Edit Book';
            
            // Populate form
            document.getElementById('bookTitle').value = book.title;
            document.getElementById('bookAuthor').value = book.author;
            document.getElementById('bookGenre').value = book.genre;
            document.getElementById('bookPages').value = book.pages;
            document.getElementById('bookStatus').value = book.status;
            document.getElementById('bookPriority').value = book.priority;
            document.getElementById('bookNotes').value = book.notes;
            document.getElementById('bookCoverUrl').value = book.coverUrl;
            
            document.getElementById('bookModalOverlay').classList.add('active');
            document.getElementById('bookTitle').focus();
        }
    }

    hideBookModal() {
        document.getElementById('bookModalOverlay').classList.remove('active');
        this.editingBookId = null;
    }

    showProgressModal(id) {
        const book = this.books.find(book => book.id === id);
        if (book) {
            this.currentProgressBookId = id;
            document.getElementById('currentPage').value = book.currentPage;
            document.getElementById('progressNotes').value = book.progressNotes;
            document.getElementById('progressModalOverlay').classList.add('active');
            document.getElementById('currentPage').focus();
        }
    }

    hideProgressModal() {
        document.getElementById('progressModalOverlay').classList.remove('active');
        this.currentProgressBookId = null;
    }

    handleBookSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const bookData = Object.fromEntries(formData.entries());
        
        // Validation
        if (!bookData.title.trim() || !bookData.author.trim()) {
            this.showNotification('Please fill in all required fields.', 'error');
            return;
        }
        
        if (this.editingBookId) {
            this.updateBook(this.editingBookId, bookData);
        } else {
            this.addBook(bookData);
        }
    }

    handleProgressSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const progressData = Object.fromEntries(formData.entries());
        
        if (this.currentProgressBookId) {
            this.updateProgress(this.currentProgressBookId, progressData);
        }
    }

    setView(view) {
        this.currentView = view;
        document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
        document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
        this.render();
        
        // Save preference
        localStorage.setItem('readingListView', view);
    }

    toggleFocusMode() {
        this.focusMode = !this.focusMode;
        document.body.classList.toggle('focus-mode', this.focusMode);
        document.getElementById('focusModeBtn').classList.toggle('active', this.focusMode);
        
        // Save preference
        localStorage.setItem('readingListFocusMode', this.focusMode);
        
        this.showNotification(
            this.focusMode ? 'Focus mode enabled' : 'Focus mode disabled', 
            'info'
        );
    }

    toggleThemeDropdown() {
        const dropdown = document.getElementById('themeDropdown');
        dropdown.classList.toggle('active');
        document.getElementById('themeBtn').classList.toggle('active', dropdown.classList.contains('active'));
    }

    changeTheme(themeName) {
        // Remove existing theme classes
        const themes = ['vibrant', 'ocean', 'sunset', 'forest', 'cosmic', 'aurora', 'fire', 'ice', 'monochrome'];
        themes.forEach(theme => {
            document.body.classList.remove(`theme-${theme}`);
        });
        
        // Add new theme class
        if (themeName !== 'vibrant') {
            document.body.classList.add(`theme-${themeName}`);
        }
        
        this.currentTheme = themeName;
        
        // Save preference
        localStorage.setItem('readingListTheme', themeName);
        
        // Close dropdown
        document.getElementById('themeDropdown').classList.remove('active');
        document.getElementById('themeBtn').classList.remove('active');
        
        // Show notification
        const themeNames = {
            'vibrant': 'Vibrant',
            'ocean': 'Ocean',
            'sunset': 'Sunset',
            'forest': 'Forest',
            'cosmic': 'Cosmic',
            'aurora': 'Aurora',
            'fire': 'Fire',
            'ice': 'Ice',
            'monochrome': 'Monochrome'
        };
        
        this.showNotification(`Theme changed to ${themeNames[themeName]}`, 'success');
    }

    cycleTheme() {
        const themes = ['vibrant', 'ocean', 'sunset', 'forest', 'cosmic', 'aurora', 'fire', 'ice', 'monochrome'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.changeTheme(themes[nextIndex]);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'info': 'info-circle',
            'warning': 'exclamation-triangle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            'success': '#50C878',
            'error': '#FF6B6B',
            'info': '#4A90E2',
            'warning': '#FFB347'
        };
        return colors[type] || '#4A90E2';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ReadingListApp();
    
    // Load saved preferences
    const savedView = localStorage.getItem('readingListView');
    if (savedView) {
        app.setView(savedView);
    }
    
    const savedFocusMode = localStorage.getItem('readingListFocusMode') === 'true';
    if (savedFocusMode) {
        app.toggleFocusMode();
    }
    
    const savedTheme = localStorage.getItem('readingListTheme');
    if (savedTheme && savedTheme !== 'vibrant') {
        app.changeTheme(savedTheme);
    }
    
    // Add some sample books if none exist
    if (app.books.length === 0) {
        const sampleBooks = [
            {
                title: "Atomic Habits",
                author: "James Clear",
                genre: "Self-Help",
                pages: 320,
                status: "to-read",
                priority: "high",
                notes: "Recommended by multiple people for building better habits.",
                coverUrl: ""
            },
            {
                title: "The Midnight Library",
                author: "Matt Haig",
                genre: "Fiction",
                pages: 288,
                status: "reading",
                priority: "medium",
                notes: "A thought-provoking story about life choices and regrets.",
                coverUrl: "",
                currentPage: 45
            },
            {
                title: "Sapiens",
                author: "Yuval Noah Harari",
                genre: "History",
                pages: 443,
                status: "completed",
                priority: "high",
                notes: "Fascinating look at human history and development.",
                coverUrl: "",
                currentPage: 443,
                dateCompleted: new Date().toISOString()
            }
        ];
        
        sampleBooks.forEach(bookData => {
            app.addBook(bookData);
        });
        
        app.showNotification('Welcome! I\'ve added some sample books to get you started.', 'info');
    }
});
