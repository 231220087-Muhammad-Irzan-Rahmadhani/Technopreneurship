function antriApp() {
    return {
        isLoggedIn: false,
        authMode: 'login',
        klikLogo: 0,
        currentView: 'home',
        showModal: false,
        showCustomerReviewModal: false,
        showSavedMsg: false,
        authForm: { username: '', password: '', name: '' },
        tempName: '',
        tempPhoto: '',
        activeTask: null,
        searchQuery: '',
        filterKategori: 'SEMUA',
        user: { 
            username: '', 
            name: 'USER', 
            photo: '', 
            xp: 0, 
            balance: 0, 
            completedTasks: 0 
        },
        listAntrean: [],
        myTasks: [],
        ranks: [
            { name: 'ROOKIE', min: 0, next: 500 },
            { name: 'ELITE', min: 500, next: 2000 },
            { name: 'PRO', min: 2000, next: 5000 },
            { name: 'LEGEND', min: 5000, next: 100000 }
        ],
        form: { 
            judul: '', 
            lokasi: '', 
            patokan: '', 
            harga: '', 
            nama: '', 
            wa: '', 
            kategori: 'UMUM' 
        },

        init() {
            // 1. Load Sesi Login
            const session = localStorage.getItem('antriin_session_user');
            if (session) {
                try {
                    this.user = JSON.parse(session);
                    this.isLoggedIn = true;
                    this.tempName = this.user.name;
                    this.tempPhoto = this.user.photo;
                } catch (e) {
                    console.error("Gagal parse session:", e);
                }
            }

            // 2. Load Data Antrean Global
            const savedItems = localStorage.getItem('antriin_db_items');
            this.listAntrean = savedItems ? JSON.parse(savedItems) : [
                { id: 1, judul: 'Antre Mie Gacoan', lokasi: 'Sudirman', patokan: 'Parkiran Motor', harga: 25000, kategori: 'KULINER', xpReward: 100, wa: '6289', nama: 'Ica', waktu: '2m lalu', status: 'OPEN' }
            ];

            // 3. Load Tugas Saya (Hanya jika login)
            if (this.isLoggedIn && this.user.username) {
                this.loadUserTasks();
            }
        },

        loadUserTasks() {
            const tasks = localStorage.getItem('antriin_mytasks_' + this.user.username);
            this.myTasks = tasks ? JSON.parse(tasks) : [];
        },

        // --- AUTH FUNCTIONS ---
        register() {
            if (!this.authForm.username || !this.authForm.password || !this.authForm.name) {
                return alert('Mohon isi semua kolom daftar!');
            }

            let users = JSON.parse(localStorage.getItem('antriin_users') || '[]');
            if (users.find(u => u.username === this.authForm.username)) {
                return alert('Username sudah ada!');
            }

            let newUser = {
                username: this.authForm.username,
                password: this.authForm.password,
                name: this.authForm.name,
                xp: 0,
                balance: 0,
                completedTasks: 0,
                photo: ''
            };

            users.push(newUser);
            localStorage.setItem('antriin_users', JSON.stringify(users));
            alert('Berhasil Daftar! Silahkan Login.');
            this.authMode = 'login';
        },

        login() {
            let users = JSON.parse(localStorage.getItem('antriin_users') || '[]');
            let found = users.find(u => u.username === this.authForm.username && u.password === this.authForm.password);

            if (found) {
                this.user = found;
                this.isLoggedIn = true;
                this.tempName = found.name;
                this.tempPhoto = found.photo;
                localStorage.setItem('antriin_session_user', JSON.stringify(found));
                this.loadUserTasks();
            } else {
                alert('Username atau Password salah!');
            }
        },

        logout() {
            this.isLoggedIn = false;
            localStorage.removeItem('antriin_session_user');
            this.currentView = 'home';
            this.user = { username: '', name: 'USER', photo: '', xp: 0, balance: 0, completedTasks: 0 };
        },

        // --- PROFILE FUNCTIONS ---
        handlePhotoPreview(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (f) => this.tempPhoto = f.target.result;
            reader.readAsDataURL(file);
        },

        saveProfile() {
            this.user.name = this.tempName;
            this.user.photo = this.tempPhoto;
            this.showSavedMsg = true;
            setTimeout(() => this.showSavedMsg = false, 2000);
            this.syncDB();
        },

        openProfile() {
            this.tempName = this.user.name;
            this.tempPhoto = this.user.photo;
            this.currentView = 'profile';
        },

        get currentRank() {
            return this.ranks.find(r => this.user.xp < r.next) || this.ranks[this.ranks.length - 1];
        },

        get progressXP() {
            let nextRankXP = this.currentRank.next;
            return Math.min((this.user.xp / nextRankXP) * 100, 100);
        },

        // --- CORE FEATURES ---
        get filteredAntrean() {
            return this.listAntrean.filter(i =>
                (this.filterKategori === 'SEMUA' || i.kategori === this.filterKategori) &&
                i.judul.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        },

        tambahAntrean() {
            if (!this.form.judul || !this.form.harga) return alert('Isi minimal judul dan harga!');

            let xpBase = this.form.kategori === 'ADMIN' ? 200 : (this.form.kategori === 'KULINER' ? 100 : 150);
            const dataBaru = {
                ...this.form,
                id: Date.now(),
                waktu: 'Barusan',
                status: 'OPEN',
                xpReward: xpBase
            };

            this.listAntrean.unshift(dataBaru);
            localStorage.setItem('antriin_db_items', JSON.stringify(this.listAntrean));
            this.showModal = false;
            this.form = { judul: '', lokasi: '', patokan: '', harga: '', nama: '', wa: '', kategori: 'UMUM' };
            alert('Misi berhasil diposting!');
        },

        ambilAntrean(item) {
            if (!this.isLoggedIn) return alert('Silahkan login terlebih dahulu!');

            // Update status di list global
            item.status = 'TAKEN';
            item.takenBy = this.user.name;

            // Masukkan ke tugas aktif saya
            this.myTasks.push({ ...item });

            // Simpan ke DB
            localStorage.setItem('antriin_db_items', JSON.stringify(this.listAntrean));
            localStorage.setItem('antriin_mytasks_' + this.user.username, JSON.stringify(this.myTasks));

            this.currentView = 'profile';
            alert('Misi diambil! Segera hubungi client.');
        },

        finishTaskAsJoki(task) {
            this.activeTask = task;
            this.showCustomerReviewModal = true;
        },

        completeMisi() {
            if (!this.activeTask) return;

            // Tambah Reward ke User
            this.user.xp += (this.activeTask.xpReward || 0);
            this.user.balance += parseInt(this.activeTask.harga || 0);
            this.user.completedTasks += 1;

            // Hapus dari tugas aktif
            this.myTasks = this.myTasks.filter(t => t.id !== this.activeTask.id);
            // Hapus dari daftar antrean global
            this.listAntrean = this.listAntrean.filter(t => t.id !== this.activeTask.id);

            // Update semua storage
            localStorage.setItem('antriin_db_items', JSON.stringify(this.listAntrean));
            localStorage.setItem('antriin_mytasks_' + this.user.username, JSON.stringify(this.myTasks));

            this.showCustomerReviewModal = false;
            this.syncDB();
            this.activeTask = null;
            alert('Selamat! Upah & XP telah masuk ke akunmu.');
        },

        // --- LEADERBOARD ---
        get leaderboardData() {
            let users = JSON.parse(localStorage.getItem('antriin_users') || '[]');
            return users.sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);
        },

        syncDB() {
            if (!this.user.username) return;
            
            // Update Sesi Aktif
            localStorage.setItem('antriin_session_user', JSON.stringify(this.user));

            // Update di daftar User Global
            let users = JSON.parse(localStorage.getItem('antriin_users') || '[]');
            let idx = users.findIndex(u => u.username === this.user.username);
            if (idx !== -1) {
                users[idx] = this.user;
                localStorage.setItem('antriin_users', JSON.stringify(users));
            }
        }
    }
}
