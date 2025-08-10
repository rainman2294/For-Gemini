document.addEventListener('DOMContentLoaded', function() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    // --- CONFIGURATION ---
    const EVENT_TYPES = {
        power_outage: { label: 'Power Outage', color: '#ef4444', icon: '⚡️' },
        rest_time: { label: 'Rest Time', color: '#f59e0b', icon: '☕️' },
        free_time: { label: 'Free Time', color: '#a8a29e', icon: '👤' },
        vacation: { label: 'Vacation', color: '#3b82f6', icon: '🌴' },
        overtime: { label: 'Overtime', color: '#8b5cf6', icon: '💪' },
        compensation: { label: 'Compensated', color: '#16a34a', icon: '✅' }
    };
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const START_HOUR = 8;
    const END_HOUR = 20;
    const TOTAL_HOURS_PER_DAY = END_HOUR - START_HOUR;

    // --- GLOBAL STATE ---
    let ALL_USERS = [];
    let ALL_EVENTS = [];
    let CURRENT_USER_ID = null;
    let CURRENT_USERNAME = null;
    let selectedDate = new Date();
    let activeDate = formatDate(new Date());
    let activeEventType = 'all';
    let activeEditorEventType = 'power_outage';
    let reportType = 'weekly'; // 'weekly' or 'monthly'
    let exportUserScope = 'all'; // 'all' or 'current'
    let isDragging = false;
    let dragMode = null;
    
    // --- DATE HELPER FUNCTIONS ---
    function getWeekStartDate(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }

    function getWeekDates(startDate) {
        const dates = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            dates.push(d);
        }
        return dates;
    }

    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    function isWeekEditable(date) {
        const weekStart = getWeekStartDate(date);
        const today = new Date();
        const thisWeekStart = getWeekStartDate(today);
        const lastWeekStart = getWeekStartDate(new Date(new Date().setDate(today.getDate() - 7)));
        return formatDate(weekStart) === formatDate(thisWeekStart) || formatDate(weekStart) === formatDate(lastWeekStart);
    }

    // --- INITIALIZATION ---
    function init() {
        const token = localStorage.getItem('pos_jwt_token');
        if (token) {
            renderDashboardShell();
            fetchAndRenderDashboard();
        } else {
            renderLoginShell();
        }
    }

    // --- SHELL RENDERING ---
    function renderLoginShell() {
        appContainer.innerHTML = `
            <div id="loginView">
                <h1 class="text-2xl font-bold text-center mb-6 text-gray-800">Scheduler Login</h1>
                <form id="login-form">
                    <div><label for="username" class="block text-sm font-medium text-gray-700">Username</label><input type="text" id="username" name="username" required></div>
                    <div><label for="password" class="block text-sm font-medium text-gray-700">Password</label><input type="password" id="password" name="password" required></div>
                    <button type="submit" id="login-button">Login</button>
                    <p id="login-error" class="hidden"></p>
                </form>
            </div>`;
        document.getElementById('login-form').addEventListener('submit', handleLogin);
    }

    function renderDashboardShell() {
        const currentUserDisplay = CURRENT_USERNAME ? `<span class="text-sm text-gray-600">Welcome, ${CURRENT_USERNAME}</span>` : '';
        appContainer.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div><h1 class="text-3xl font-bold text-gray-800">Team Schedule</h1><p class="text-gray-500 mt-1">Comprehensive timeline of team availability and tasks.</p></div>
                <div class="flex flex-col sm:flex-row items-end sm:items-center gap-2">${currentUserDisplay}<button id="logoutBtn" class="bg-gray-600 text-white px-5 py-2.5 rounded-lg shadow hover:bg-gray-700">Logout</button></div>
            </div>
            <div id="dashboardView">
                <div class="mb-4"><nav class="flex justify-between items-center w-full" id="event-type-tabs-container"></nav></div>
                <div id="date-navigator-wrapper" class="flex justify-between items-center mb-4 border-b border-gray-200">
                    <div id="day-tabs-wrapper" class="flex-grow"><nav class="-mb-px flex space-x-6" id="day-tabs"></nav></div>
                    <div id="month-navigator" class="flex items-center gap-2 p-2"></div>
                </div>
                <div id="timeline-content"><div class="text-center p-8">Loading...</div></div>
            </div>
            <div id="toast-notification" class="hidden fixed bottom-5 right-5 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg"></div>
            <div id="logout-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Confirm Logout</h3><p class="text-gray-600 mb-6">Are you sure you want to log out?</p>
                    <div class="flex gap-3 justify-end"><button id="cancelLogout" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button><button id="confirmLogout" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Logout</button></div>
                </div>
            </div>`;
        addDashboardEventListeners();
    }

    // --- DYNAMIC CONTENT RENDERING ---
    function updateDashboardView() {
        renderEventTypeTabs();
        renderMonthNavigator();
        const dayTabsWrapper = document.getElementById('day-tabs-wrapper');
        if (activeEventType === 'reports' || activeEventType === 'manage') {
            dayTabsWrapper.style.visibility = 'hidden';
        } else {
            dayTabsWrapper.style.visibility = 'visible';
        }
        if (activeEventType === 'reports') {
            // Ensure selectedDate is properly aligned for the report type
            if (reportType === 'monthly') {
                // Ensure we're at the first day of the month for monthly reports
                selectedDate.setDate(1);
            } else {
                // Ensure we're at the start of the week for weekly reports
                selectedDate = getWeekStartDate(selectedDate);
            }
            fetchAndRenderDashboard(); // Refetch data based on reportType
        } else if (activeEventType === 'manage') {
            renderEditor();
        } else {
            renderDayTabs();
            renderSingleDayTimeline();
        }
    }

    function renderMonthNavigator() {
        const nav = document.getElementById('month-navigator');
        let monthName, periodLabel;
        
        if (reportType === 'monthly' && activeEventType === 'reports') {
            monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            periodLabel = 'Month';
        } else if (activeEventType === 'reports') {
            // Weekly reports - show week range
            const weekStart = getWeekStartDate(selectedDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            monthName = `${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            periodLabel = 'Week';
        } else {
            monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            periodLabel = 'Month';
        }

        nav.innerHTML = `
            <button id="prev-btn" class="p-2 rounded-md hover:bg-gray-200" aria-label="Previous ${periodLabel.toLowerCase()}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <span class="font-semibold text-gray-700 w-48 text-center text-sm">${monthName}</span>
            <button id="next-btn" class="p-2 rounded-md hover:bg-gray-200" aria-label="Next ${periodLabel.toLowerCase()}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
            <button id="today-btn" class="text-sm custom-button-bg text-white px-3 py-1 rounded-lg shadow">Today</button>
        `;

        document.getElementById('prev-btn').addEventListener('click', () => {
            if (reportType === 'monthly' && activeEventType === 'reports') {
                selectedDate.setMonth(selectedDate.getMonth() - 1);
                selectedDate.setDate(1); // Ensure we're at the first day of the month
            } else {
                selectedDate.setDate(selectedDate.getDate() - 7);
            }
            if (activeEventType === 'reports') {
                renderMonthNavigator(); // Update navigator display
                renderReportsView(); // Update reports content
            } else {
                updateDashboardView();
            }
        });
        document.getElementById('next-btn').addEventListener('click', () => {
            if (reportType === 'monthly' && activeEventType === 'reports') {
                selectedDate.setMonth(selectedDate.getMonth() + 1);
                selectedDate.setDate(1); // Ensure we're at the first day of the month
            } else {
                selectedDate.setDate(selectedDate.getDate() + 7);
            }
            if (activeEventType === 'reports') {
                renderMonthNavigator(); // Update navigator display
                renderReportsView(); // Update reports content
            } else {
                updateDashboardView();
            }
        });
        document.getElementById('today-btn').addEventListener('click', () => {
            selectedDate = new Date();
            if (reportType === 'monthly' && activeEventType === 'reports') {
                selectedDate.setDate(1); // Go to first day of current month
            } else if (reportType === 'weekly' && activeEventType === 'reports') {
                selectedDate = getWeekStartDate(selectedDate); // Align to week start
            }
            if (activeEventType === 'reports') {
                renderMonthNavigator(); // Update navigator display
                renderReportsView(); // Update reports content
            } else {
                updateDashboardView();
            }
        });
    }

    function renderDayTabs() {
        const dayTabsContainer = document.getElementById('day-tabs');
        if (!dayTabsContainer) return;
        const weekDates = getWeekDates(getWeekStartDate(selectedDate));
        dayTabsContainer.innerHTML = weekDates.map(date => {
            const dateStr = formatDate(date);
            return `<button class="tab px-3 py-2 border-b-2 text-sm font-medium ${dateStr === activeDate ? 'tab-active' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}" data-date="${dateStr}">${SHORT_DAY_NAMES[date.getDay()]} <span class="font-bold">${date.getDate()}</span></button>`;
        }).join('');
        dayTabsContainer.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', (e) => {
            activeDate = e.currentTarget.dataset.date;
            renderSingleDayTimeline();
            dayTabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
            e.currentTarget.classList.add('tab-active');
        }));
    }

    function renderEventTypeTabs() {
        const container = document.getElementById('event-type-tabs-container');
        if (!container) return;

        let leftTabsHTML = `<div class="flex flex-wrap gap-2">
            <button class="tab px-4 py-2 rounded-lg text-sm font-medium ${'all' === activeEventType ? 'event-tab-active' : 'bg-white text-gray-700 hover:bg-gray-100'}" data-type="all">🌍 <span class="ml-2">All</span></button>
            ${Object.entries(EVENT_TYPES).map(([key, config]) => `<button class="tab px-4 py-2 rounded-lg text-sm font-medium ${key === activeEventType ? 'event-tab-active' : 'bg-white text-gray-700 hover:bg-gray-100'}" data-type="${key}">${config.icon} <span class="ml-2">${config.label}</span></button>`).join('')}
            <button class="tab px-4 py-2 rounded-lg text-sm font-medium ${'reports' === activeEventType ? 'event-tab-active' : 'bg-white text-gray-700 hover:bg-gray-100'}" data-type="reports">📊 <span class="ml-2">Reports</span></button>
        </div>`;

        let rightTabsHTML = `<div class="flex items-center gap-4">`;
        if (activeEventType === 'reports') {
            rightTabsHTML += `
                <div class="report-toggle">
                    <button id="weekly-report-btn" class="${reportType === 'weekly' ? 'active' : ''}">Weekly</button>
                    <button id="monthly-report-btn" class="${reportType === 'monthly' ? 'active' : ''}">Monthly</button>
                </div>
                <div class="export-scope-toggle">
                    <button id="all-users-btn" class="${exportUserScope === 'all' ? 'active' : ''}">All Users</button>
                    <button id="current-user-btn" class="${exportUserScope === 'current' ? 'active' : ''}">Current User</button>
                </div>
                <button id="export-pdf-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Export to PDF</button>
            `;
        }
        rightTabsHTML += `<button class="tab px-4 py-2 rounded-lg text-sm font-medium ${'manage' === activeEventType ? 'event-tab-active' : 'bg-white text-gray-700 hover:bg-gray-100'}" data-type="manage">✏️ <span class="ml-2">Manage</span></button></div>`;

        container.innerHTML = leftTabsHTML + rightTabsHTML;

        container.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', (e) => {
            activeEventType = e.currentTarget.dataset.type;
            updateDashboardView();
        }));

        if (activeEventType === 'reports') {
            document.getElementById('weekly-report-btn').addEventListener('click', () => { 
                reportType = 'weekly'; 
                selectedDate = getWeekStartDate(selectedDate); // Align to week start
                renderEventTypeTabs(); // Re-render tabs to update button states
                renderMonthNavigator(); // Update navigator display
                renderReportsView(); // Update reports content
            });
            document.getElementById('monthly-report-btn').addEventListener('click', () => { 
                reportType = 'monthly'; 
                selectedDate.setDate(1); // Align to month start
                renderEventTypeTabs(); // Re-render tabs to update button states
                renderMonthNavigator(); // Update navigator display
                renderReportsView(); // Update reports content
            });
            document.getElementById('all-users-btn').addEventListener('click', () => { 
                exportUserScope = 'all'; 
                renderEventTypeTabs(); // Re-render to update button states
                renderReportsView(); // Update the reports view
            });
            document.getElementById('current-user-btn').addEventListener('click', () => { 
                exportUserScope = 'current'; 
                renderEventTypeTabs(); // Re-render to update button states
                renderReportsView(); // Update the reports view
            });
            document.getElementById('export-pdf-btn').addEventListener('click', handleExportToPDF);
        }
    }

    function renderSingleDayTimeline() {
        let timelinesHTML = `<div class="bg-white rounded-2xl shadow-lg"><div class="timeline-grid grid border-b p-4"><div class="font-semibold text-gray-600">Team Member</div><div class="grid grid-cols-${TOTAL_HOURS_PER_DAY} text-center text-xs text-gray-500">${Array.from({length:TOTAL_HOURS_PER_DAY},(_,i)=>`<div>${START_HOUR+i}:00</div>`).join('')}</div></div>`;
        ALL_USERS.forEach(user => {
            const eventsForUserAndDay = ALL_EVENTS.filter(e => e.userId === user.id && e.day === activeDate && (activeEventType === 'all' || e.type === activeEventType));
            const maxLevels = calculateMaxEventLevels(eventsForUserAndDay);
            const containerHeight = Math.max(64, 40 + (maxLevels * 24));
            timelinesHTML += `<div class="timeline-grid grid items-center border-b last:border-b-0"><div class="p-4 flex items-center gap-3"><div class="w-8 h-8 text-xs flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold" style="background-color:${user.color};">${user.initials}</div><span class="font-medium text-sm text-gray-800 truncate">${user.name}</span></div><div class="relative border-l" style="height:${containerHeight}px;"><div class="grid grid-cols-${TOTAL_HOURS_PER_DAY} h-full">${Array.from({length:TOTAL_HOURS_PER_DAY},()=>`<div class="border-r h-full"></div>`).join('')}</div>${stackAndRenderEvents(eventsForUserAndDay)}</div></div>`;
        });
        document.getElementById('timeline-content').innerHTML = timelinesHTML + '</div>';
    }

    function calculateMaxEventLevels(events) {
        const eventLevels = [];
        events.sort((a, b) => a.start - b.start);
        events.forEach(event => { let level = 0; while (eventLevels[level] && event.start < eventLevels[level]) { level++; } eventLevels[level] = event.end; });
        return eventLevels.length;
    }

    function stackAndRenderEvents(events) {
        let html = '';
        const eventLevels = [];
        events.sort((a, b) => a.start - b.start);
        events.forEach(event => {
            const config = EVENT_TYPES[event.type];
            if (!config) return;
            const left = ((event.start - START_HOUR) / TOTAL_HOURS_PER_DAY) * 100;
            const width = ((event.end - event.start) / TOTAL_HOURS_PER_DAY) * 100;
            let level = 0;
            while (eventLevels[level] && event.start < eventLevels[level]) { level++; }
            eventLevels[level] = event.end;
            html += `<div class="timeline-bar" style="left:${left}%;width:${width}%;background-color:${config.color};top:${8+(level*24)}px;height:20px;">${config.icon} <span class="ml-1">${config.label}</span></div>`;
        });
        return html;
    }

    function renderReportsView() {
        let titleDate;
        if (reportType === 'weekly') {
            // Use the same logic as navigator for weekly reports
            const weekStart = getWeekStartDate(selectedDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            titleDate = `${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else {
            // Monthly format - same as navigator
            titleDate = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        
        const scopeTitle = exportUserScope === 'current' ? `My Summary` : `Team Summary`;
        let reportsHTML = `<div class="bg-white p-6 rounded-2xl shadow-lg"><h2 class="text-2xl font-bold text-gray-800 mb-2">${scopeTitle}</h2><p class="text-gray-600 mb-6">Period: ${titleDate}</p><div class="space-y-8">`;
        
        // Filter users based on export scope
        const usersToShow = exportUserScope === 'current' 
            ? ALL_USERS.filter(user => user.id === CURRENT_USER_ID) 
            : ALL_USERS;
            
        if (usersToShow.length === 0) {
            reportsHTML += `<div class="text-center p-8 text-gray-500">No data available for the selected scope.</div>`;
        } else {
            usersToShow.forEach(user => {
                const userEvents = ALL_EVENTS.filter(e => e.userId === user.id);
                const totals = {};
                Object.keys(EVENT_TYPES).forEach(key => totals[key] = 0);
                let unavailableHours = 0, compensatedHours = 0;
                userEvents.forEach(event => {
                    const duration = event.end - event.start;
                    if (totals[event.type] !== undefined) totals[event.type] += duration;
                    if (event.type === 'power_outage' || event.type === 'vacation') unavailableHours += duration;
                    if (event.type === 'compensation') compensatedHours += duration;
                });
                const workingHours = (reportType === 'weekly' ? 45 : 180) - unavailableHours + compensatedHours;
                const timeBalance = totals.compensation - (totals.power_outage + totals.vacation);
                reportsHTML += `<div class="border-b pb-6 last:border-b-0"><div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 text-sm rounded-full flex items-center justify-center text-white font-bold" style="background-color:${user.color};">${user.initials}</div><h3 class="text-xl font-bold text-gray-800">${user.name}</h3></div><div class="overflow-x-auto pb-2"><div class="flex space-x-6"><div class="flex-shrink-0 w-36 text-center border-r pr-6"><p class="text-sm text-gray-500">💼 Working Time</p><p class="text-3xl font-semibold text-gray-700">${workingHours} hrs</p></div>${Object.entries(EVENT_TYPES).map(([key, config]) => `<div class="flex-shrink-0 w-36 text-center border-r pr-6 last:border-r-0"><p class="text-sm text-gray-500">${config.icon} ${config.label}</p><p class="text-3xl font-semibold ${['rest_time','free_time','vacation'].includes(key)?'text-gray-400':'text-gray-700'}">${totals[key]} hrs</p></div>`).join('')}<div class="flex-shrink-0 w-36 text-center"><p class="text-sm font-bold text-gray-500">📊 Balance</p><p class="text-3xl font-bold ${timeBalance>=0?'text-green-600':'text-red-600'}">${timeBalance>0?'+':''}${timeBalance} hrs</p></div></div></div></div>`;
            });
        }
        document.getElementById('timeline-content').innerHTML = reportsHTML + '</div></div>';
    }
    
    function renderEditor() {
        const isEditable = isWeekEditable(selectedDate);
        const editorTabsHTML = Object.entries(EVENT_TYPES).map(([key, config]) => `<button class="tab px-4 py-2 rounded-lg text-sm font-medium ${key === activeEditorEventType ? 'event-tab-active' : 'bg-white text-gray-700 hover:bg-gray-100 border'}" data-type="${key}">${config.icon} <span class="ml-2">${config.label}</span></button>`).join('');
        const editorHTML = `<div class="bg-white p-6 rounded-2xl shadow-lg"><h2 class="text-2xl font-bold text-gray-800 mb-2">My Schedule Editor</h2><p class="text-gray-600 mb-4">Select an event type, then click and drag on the grid to set your times.</p>${!isEditable ? `<p class="text-center text-red-600 font-semibold p-2 bg-red-50 rounded-lg mb-4">This week is view-only. Only the current and previous weeks can be edited.</p>` : ''}<div class="mb-6"><nav class="flex flex-wrap gap-2" id="editor-event-type-tabs">${editorTabsHTML}</nav></div><div class="overflow-x-auto ${isEditable ? '' : 'disabled-grid'}"><table class="min-w-full border-collapse text-center"><thead id="editor-header"></thead><tbody id="editor-body"></tbody></table></div><div class="mt-6 text-right"><button id="saveScheduleBtn" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700" ${!isEditable ? 'disabled' : ''}>Save My Schedule</button></div></div>`;
        document.getElementById('timeline-content').innerHTML = editorHTML;
        document.getElementById('editor-event-type-tabs').querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', (e) => { activeEditorEventType = e.currentTarget.dataset.type; renderEditor(); }));
        document.getElementById('saveScheduleBtn').addEventListener('click', handleSaveSchedule);
        renderEditorGrid();
    }
            
    function renderEditorGrid() {
        const header = document.getElementById('editor-header'), body = document.getElementById('editor-body');
        if (!header || !body) return;
        header.innerHTML = `<tr><th class="p-2 border w-32">Day</th>${Array.from({length: TOTAL_HOURS_PER_DAY}, (_, i) => `<th class="p-2 border font-mono text-xs w-16">${START_HOUR + i}:00</th>`).join('')}</tr>`;
        body.innerHTML = '';
        const currentUserEvents = ALL_EVENTS.filter(e => parseInt(e.userId) === parseInt(CURRENT_USER_ID));
        const activeConfig = EVENT_TYPES[activeEditorEventType];
        const weekDates = getWeekDates(getWeekStartDate(selectedDate));
        weekDates.forEach(date => {
            const dateStr = formatDate(date);
            let rowHtml = `<tr><td class="p-2 border font-semibold text-sm">${DAY_NAMES[date.getDay()]}<br><span class="font-normal text-xs text-gray-500">${dateStr}</span></td>`;
            for (let hour = START_HOUR; hour < END_HOUR; hour++) {
                const event = currentUserEvents.find(e => e.day === dateStr && e.type === activeEditorEventType && hour >= e.start && hour < e.end);
                rowHtml += `<td class="time-slot border select-none" data-date="${dateStr}" data-hour="${hour}" data-selected="${!!event}" style="background-color:${!!event ? activeConfig.color : '#f9fafb'};"></td>`;
            }
            body.innerHTML += rowHtml + '</tr>';
        });
        addEditorGridListeners();
    }

    // --- DATA HANDLING & API ---
    async function handleLogin(e) {
        e.preventDefault();
        const btn = document.getElementById('login-button'), err = document.getElementById('login-error');
        btn.textContent='Logging in...'; btn.disabled=true; err.classList.add('hidden');
        try {
            const res = await fetch('/wp-json/jwt-auth/v1/token', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username:e.target.username.value,password:e.target.password.value})});
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Login failed.');
            localStorage.setItem('pos_jwt_token', data.token);
            CURRENT_USER_ID = parseInt(data.user_id);
            CURRENT_USERNAME = extractUsernameFromJWT(data.token);
            renderDashboardShell();
            fetchAndRenderDashboard();
        } catch (error) {
            err.textContent = error.message; err.classList.remove('hidden');
        } finally {
            btn.textContent = 'Login'; btn.disabled = false;
        }
    }

    function handleLogout() { document.getElementById('logout-modal').classList.remove('hidden'); }
    function confirmLogout() { localStorage.removeItem('pos_jwt_token'); CURRENT_USER_ID=null; CURRENT_USERNAME=null; ALL_USERS=[]; ALL_EVENTS=[]; document.getElementById('logout-modal').classList.add('hidden'); renderLoginShell(); }
    function cancelLogout() { document.getElementById('logout-modal').classList.add('hidden'); }

    async function fetchAndRenderDashboard() {
        const token = localStorage.getItem('pos_jwt_token');
        if (!token) { handleLogout(); return; }

        let url;
        if (activeEventType === 'reports' && reportType === 'monthly') {
            const monthStr = selectedDate.toISOString().slice(0, 7); // YYYY-MM
            url = `${pos_data.api_url}schedule/monthly?month=${monthStr}`;
        } else {
            const formattedStartDate = formatDate(getWeekStartDate(selectedDate));
            url = `${pos_data.api_url}schedule/weekly?start_date=${formattedStartDate}`;
            const weekDates = getWeekDates(getWeekStartDate(selectedDate)).map(d => formatDate(d));
            if (!weekDates.includes(activeDate)) activeDate = formattedStartDate;
        }

        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) { const errData = await response.json().catch(()=>({})); throw new Error(errData.message || `Server error: ${response.status}`); }
            const data = await response.json();
            ALL_USERS = data.users || [];
            ALL_EVENTS = data.events || [];
            if (!CURRENT_USER_ID) { try { CURRENT_USER_ID = parseInt(JSON.parse(atob(token.split('.')[1])).data.user.id); } catch(e) { console.error(e); } }
            if (!CURRENT_USERNAME) { CURRENT_USERNAME = extractUsernameFromJWT(token); }
            
            if(activeEventType === 'reports') {
                renderReportsView();
            } else {
                updateDashboardView();
            }

        } catch (error) {
            console.error('Dashboard fetch error:', error);
            alert(`Failed to load dashboard: ${error.message}`);
            handleLogout();
        }
    }

    async function handleSaveSchedule() {
        const token = localStorage.getItem('pos_jwt_token');
        if (!token) { handleLogout(); return; }
        const saveButton = document.getElementById('saveScheduleBtn');
        saveButton.textContent = 'Saving...'; saveButton.disabled = true;
        const newEventsForType = [], newEventsByDay = {};
        document.querySelectorAll('#editor-body .time-slot[data-selected="true"]').forEach(slot => {
            const day = slot.dataset.date, hour = parseInt(slot.dataset.hour);
            if (!newEventsByDay[day]) newEventsByDay[day] = [];
            newEventsByDay[day].push(hour);
        });
        for (const day in newEventsByDay) {
            const hours = newEventsByDay[day].sort((a, b) => a - b);
            if (hours.length === 0) continue;
            let start = hours[0];
            for (let i = 0; i < hours.length; i++) {
                if (i + 1 < hours.length && hours[i+1] === hours[i] + 1) continue;
                newEventsForType.push({ id: `${CURRENT_USER_ID}-${activeEditorEventType}-${day}-${start}`, userId: CURRENT_USER_ID, type: activeEditorEventType, day, start, end: hours[i] + 1 });
                if (i + 1 < hours.length) start = hours[i+1];
            }
        }
        try {
            const weekStartDate = formatDate(getWeekStartDate(selectedDate));
            const response = await fetch(`${pos_data.api_url}schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ events: newEventsForType, eventType: activeEditorEventType, weekStartDate }) });
            if (!response.ok) throw new Error((await response.json()).message || 'Save failed');
            const weekDates = getWeekDates(getWeekStartDate(selectedDate)).map(d => formatDate(d));
            ALL_EVENTS = ALL_EVENTS.filter(e => !(parseInt(e.userId) === parseInt(CURRENT_USER_ID) && e.type === activeEditorEventType && weekDates.includes(e.day)));
            ALL_EVENTS.push(...newEventsForType);
            showToast('Schedule saved successfully!');
            renderEditorGrid();
        } catch (error) {
            showToast(`Error: ${error.message}`, true);
        } finally {
            saveButton.textContent = 'Save My Schedule';
            saveButton.disabled = !isWeekEditable(selectedDate);
        }
    }

    function handleExportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let titleDate;
        if (reportType === 'weekly') {
            // Use the same logic as navigator and reports view
            const weekStart = getWeekStartDate(selectedDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            titleDate = `${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else {
            // Monthly format - same as navigator and reports view
            titleDate = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        
        const scopeTitle = exportUserScope === 'current' ? 'My Time Report' : 'Team Time Report';
        const title = `${scopeTitle} for ${titleDate}`;
        doc.text(title, 14, 16);

        const head = [['Team Member', ...Object.values(EVENT_TYPES).map(e => e.label), 'Working Time', 'Balance']];
        const body = [];

        // Filter users based on export scope
        const usersToExport = exportUserScope === 'current' 
            ? ALL_USERS.filter(user => user.id === CURRENT_USER_ID) 
            : ALL_USERS;

        usersToExport.forEach(user => {
            const userEvents = ALL_EVENTS.filter(e => e.userId === user.id);
            const totals = {};
            Object.keys(EVENT_TYPES).forEach(key => totals[key] = 0);
            let unavailableHours = 0, compensatedHours = 0;
            userEvents.forEach(event => {
                const duration = event.end - event.start;
                if (totals[event.type] !== undefined) totals[event.type] += duration;
                if (event.type === 'power_outage' || event.type === 'vacation') unavailableHours += duration;
                if (event.type === 'compensation') compensatedHours += duration;
            });
            const workingHours = (reportType === 'weekly' ? 45 : 180) - unavailableHours + compensatedHours;
            const timeBalance = totals.compensation - (totals.power_outage + totals.vacation);
            
            const row = [user.name];
            Object.keys(EVENT_TYPES).forEach(key => row.push(totals[key] + ' hrs'));
            row.push(workingHours + ' hrs');
            row.push((timeBalance > 0 ? '+' : '') + timeBalance + ' hrs');
            body.push(row);
        });

        doc.autoTable({
            head: head,
            body: body,
            startY: 24,
            theme: 'grid',
            headStyles: { fillColor: [235, 26, 109] },
        });

        const filePrefix = exportUserScope === 'current' ? 'my-report' : 'team-report';
        doc.save(`${filePrefix}-${reportType}-${formatDate(selectedDate)}.pdf`);
    }

    // --- UTILITY & EVENT LISTENERS ---
    function showToast(message, isError = false) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;
        toast.textContent = message; toast.style.backgroundColor = isError ? '#ef4444' : '#333';
        toast.classList.remove('hidden'); toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); toast.classList.add('hidden'); }, 3000);
    }

    function extractUsernameFromJWT(token) {
        try { const payload = JSON.parse(atob(token.split('.')[1])); return payload.data?.user?.display_name || payload.user_login || null; } catch (e) { return null; }
    }
    
    function addDashboardEventListeners() {
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        document.getElementById('confirmLogout').addEventListener('click', confirmLogout);
        document.getElementById('cancelLogout').addEventListener('click', cancelLogout);
    }

    function handleEditorMouseDown(e) {
        if (!e.target.classList.contains('time-slot') || e.target.closest('.disabled-grid')) return;
        isDragging = true; dragMode = e.target.dataset.selected === 'true' ? 'deselect' : 'select';
        toggleSlot(e.target); e.preventDefault();
    }

    function handleEditorMouseOver(e) { if (!isDragging || !e.target.classList.contains('time-slot')) return; toggleSlot(e.target, true); }
    function handleEditorMouseUp() { isDragging = false; dragMode = null; }

    function addEditorGridListeners() {
        const editorBody = document.getElementById('editor-body');
        if (!editorBody) return;
        editorBody.removeEventListener('mousedown', handleEditorMouseDown);
        editorBody.removeEventListener('mouseover', handleEditorMouseOver);
        document.removeEventListener('mouseup', handleEditorMouseUp);
        if (!editorBody.closest('.disabled-grid')) {
            editorBody.addEventListener('mousedown', handleEditorMouseDown);
            editorBody.addEventListener('mouseover', handleEditorMouseOver);
            document.addEventListener('mouseup', handleEditorMouseUp);
        }
    }

    function toggleSlot(cell, isDrag = false) {
        const config = EVENT_TYPES[activeEditorEventType];
        const isSelected = cell.dataset.selected === 'true';
        if (isDrag) {
            if (dragMode === 'select' && !isSelected) { cell.style.backgroundColor = config.color; cell.dataset.selected = 'true'; } 
            else if (dragMode === 'deselect' && isSelected) { cell.style.backgroundColor = '#f9fafb'; cell.dataset.selected = 'false'; }
        } else {
            if (isSelected) { cell.style.backgroundColor = '#f9fafb'; cell.dataset.selected = 'false'; } 
            else { cell.style.backgroundColor = config.color; cell.dataset.selected = 'true'; }
        }
    }
    
    // --- START THE APP ---
    init();
});
