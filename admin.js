const SUPABASE_URL = 'https://nvedswstitcfawyufoah.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_ttErldmDQCtFDhtOiYF5sQ_y7g4TU18';

document.addEventListener("DOMContentLoaded", async () => {
    const supabase = window.createClient(SUPABASE_URL, SUPABASE_KEY);
    let globalProfiles = []; 

    // 1. ROUTE PROTECTION
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!session) {
        console.warn("Security Alert: Unauthorized access attempt detected.");
        window.location.replace("index.html"); 
        return;
    }

    document.getElementById('secureContent').style.display = "flex";
    document.getElementById('welcomeMessage').innerText = `System Active. Logged in as: Administrator`;

    // 2. FETCH DATA & RENDER TABLE WITH PHOTOS
    async function loadDatabase() {
        try {
            const { data: profiles, error: fetchError } = await supabase.from('profiles').select('*');
            if (fetchError) throw fetchError;

            globalProfiles = profiles; 
            const students = profiles.filter(p => p.role === 'student');
            const instructors = profiles.filter(p => p.role === 'instructor');
            
            document.getElementById('studentCount').innerText = students.length;
            document.getElementById('instructorCount').innerText = instructors.length;

            const tbody = document.getElementById('userTableBody');
            tbody.innerHTML = ''; 
            
            profiles.forEach(user => {
                const fullName = `${user.surname || 'N/A'}, ${user.given_name || ''} ${user.middle_name || ''}`.trim();
                
                // Set default avatar if no photo is found
                const photoSrc = user.avatar_url ? user.avatar_url : `https://ui-avatars.com/api/?name=${user.surname}&background=020617&color=38bdf8`;

                const actionButtons = user.role === 'administrator' 
                    ? `<span style="color: #64748b; font-size: 0.8rem;">Protected</span>`
                    : `<button class="btn-edit" data-id="${user.id}">✏️ Edit</button>
                       <button class="btn-delete" data-id="${user.id}" data-name="${fullName}">🗑️ Delete</button>`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><img src="${photoSrc}" class="avatar-img"></td>
                    <td>${user.id_number || 'N/A'}</td>
                    <td>${fullName}</td>
                    <td>${user.course_year || 'N/A'}</td>
                    <td style="text-transform: capitalize; color: ${user.role === 'administrator' ? '#ef4444' : '#38bdf8'}">${user.role}</td>
                    <td class="action-cell">${actionButtons}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error("Database error:", err);
        }
    }

    loadDatabase();

    // 3. DRAG & DROP PHOTO UPLOAD SETUP
    function setupDragAndDrop(areaId, fileInputId, previewId, textId) {
        const dropArea = document.getElementById(areaId);
        const fileInput = document.getElementById(fileInputId);
        const preview = document.getElementById(previewId);
        const text = document.getElementById(textId);

        dropArea.addEventListener('click', () => fileInput.click());

        dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('dragover'); });
        dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault(); dropArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                showPreview(fileInput.files, preview, text);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) showPreview(fileInput.files, preview, text);
        });
    }

    function showPreview(file, preview, text) {
        if (file) {
            preview.src = URL.createObjectURL(file);
            preview.style.display = 'block';
            text.style.display = 'none';
        }
    }

    // Initialize the upload boxes
    setupDragAndDrop('s_dropArea', 's_avatarFile', 's_avatarPreview', 's_dropText');
    setupDragAndDrop('e_dropArea', 'e_avatarFile', 'e_avatarPreview', 'e_dropText');


    // 4. TABLE ACTION LISTENERS (EDIT / DELETE)
    document.getElementById('userTableBody').addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit'); 
        if (editBtn) {
            const userId = editBtn.getAttribute('data-id');
            const user = globalProfiles.find(p => String(p.id) === String(userId));
            
            if (user) {
                document.getElementById('edit_id').value = user.id;
                document.getElementById('e_username').value = user.username || '';
                document.getElementById('e_surname').value = user.surname || '';
                document.getElementById('e_givenName').value = user.given_name || '';
                document.getElementById('e_middleName').value = user.middle_name || '';
                document.getElementById('e_idNumber').value = user.id_number || '';
                document.getElementById('e_courseYear').value = user.course_year || '';
                
                // Show existing photo in preview if they have one
                const e_preview = document.getElementById('e_avatarPreview');
                const e_text = document.getElementById('e_dropText');
                if (user.avatar_url) {
                    e_preview.src = user.avatar_url;
                    e_preview.style.display = 'block';
                    e_text.style.display = 'none';
                } else {
                    e_preview.src = '';
                    e_preview.style.display = 'none';
                    e_text.style.display = 'block';
                }

                document.getElementById('editModal').style.display = 'flex';
            }
            return; 
        }

        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            const userId = deleteBtn.getAttribute('data-id');
            const userName = deleteBtn.getAttribute('data-name');
            if (confirm(`CRITICAL WARNING:\nAre you sure you want to delete ${userName}?`)) {
                deleteBtn.innerText = "Deleting...";
                const { error } = await supabase.from('profiles').delete().eq('id', userId);
                if (error) alert("Database error: " + error.message);
                loadDatabase(); 
            }
        }
    });

    // 5. SUBMIT EDIT FORM & PHOTO
    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('updateUserBtn');
        saveBtn.innerText = "Processing Updates...";
        saveBtn.disabled = true;

        const userId = document.getElementById('edit_id').value;
        const e_username = document.getElementById('e_username').value.trim();
        let finalAvatarUrl = globalProfiles.find(p => String(p.id) === String(userId)).avatar_url; // Keep old photo by default

        // Handle Photo Upload if they selected a new one
        const photoFile = document.getElementById('e_avatarFile').files;
        if (photoFile) {
            saveBtn.innerText = "Uploading Photo to Vault...";
            const fileName = `${e_username}-${Date.now()}.${photoFile.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, photoFile);
            
            if (!uploadError) {
                const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                finalAvatarUrl = data.publicUrl;
            }
        }

        const updates = {
            username: e_username,
            avatar_url: finalAvatarUrl,
            surname: document.getElementById('e_surname').value.trim(),
            given_name: document.getElementById('e_givenName').value.trim(),
            middle_name: document.getElementById('e_middleName').value.trim(),
            id_number: document.getElementById('e_idNumber').value.trim(),
            course_year: document.getElementById('e_courseYear').value.trim()
        };

        const { error } = await supabase.from('profiles').update(updates).eq('id', userId);

        if (error) alert("Error: " + error.message);
        else {
            alert("Profile & Photo successfully updated!");
            document.getElementById('editModal').style.display = 'none';
            document.getElementById('e_avatarFile').value = ''; // Reset file input
            loadDatabase();
        }
        saveBtn.innerText = "Update Database"; saveBtn.disabled = false;
    });

    // 6. SUBMIT CREATE STUDENT FORM & PHOTO
    document.getElementById('createStudentBtn').addEventListener('click', () => document.getElementById('studentModal').style.display = 'flex');
    document.getElementById('closeStudentModal').addEventListener('click', () => {
        document.getElementById('studentModal').style.display = 'none';
        document.getElementById('studentRegistrationForm').reset();
        document.getElementById('s_avatarPreview').style.display = 'none';
        document.getElementById('s_dropText').style.display = 'block';
    });
    document.getElementById('closeEditModal').addEventListener('click', () => document.getElementById('editModal').style.display = 'none');

    document.getElementById('studentRegistrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveStudentBtn');
        saveBtn.innerText = "Encrypting..."; saveBtn.disabled = true;

        const s_username = document.getElementById('s_username').value.trim();
        const s_password = document.getElementById('s_password').value;
        const authEmail = s_username + "@cosmos.sys"; 

        // Upload Photo if provided
        let finalAvatarUrl = null;
        const photoFile = document.getElementById('s_avatarFile').files;
        if (photoFile) {
            saveBtn.innerText = "Uploading Photo to Vault...";
            const fileName = `${s_username}-${Date.now()}.${photoFile.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, photoFile);
            if (!uploadError) {
                const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                finalAvatarUrl = data.publicUrl;
            }
        }

        // Create Auth user
        const shadowClient = window.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
        const { error: authError } = await shadowClient.auth.signUp({ email: authEmail, password: s_password });

        if (authError) {
            alert("Security Error: " + authError.message);
            saveBtn.innerText = "Save & Create Login"; saveBtn.disabled = false; return; 
        }

        // Save Profile
        const newStudent = {
            role: 'student', username: s_username, avatar_url: finalAvatarUrl,
            surname: document.getElementById('s_surname').value.trim(),
            given_name: document.getElementById('s_givenName').value.trim(),
            middle_name: document.getElementById('s_middleName').value.trim(),
            id_number: document.getElementById('s_idNumber').value.trim(),
            course_year: document.getElementById('s_courseYear').value.trim()
        };

        const { error: profileError } = await supabase.from('profiles').insert([newStudent]);

        if (profileError) alert("Database Error: " + profileError.message);
        else {
            alert("SUCCESS: Student Account, Login, & Photo Created!");
            document.getElementById('studentModal').style.display = 'none';
            document.getElementById('studentRegistrationForm').reset();
            document.getElementById('s_avatarPreview').style.display = 'none';
            document.getElementById('s_dropText').style.display = 'block';
            loadDatabase();
        }
        saveBtn.innerText = "Save & Create Login"; saveBtn.disabled = false;
    });

    // Navigation & Logout
    document.getElementById('navOverview').addEventListener('click', () => { document.getElementById('overviewSection').style.display = 'block'; document.getElementById('userDbSection').style.display = 'none'; document.getElementById('pageTitle').innerText = 'Command Center'; document.getElementById('navOverview').classList.add('active'); document.getElementById('navUserDb').classList.remove('active'); });
    document.getElementById('navUserDb').addEventListener('click', () => { document.getElementById('overviewSection').style.display = 'none'; document.getElementById('userDbSection').style.display = 'block'; document.getElementById('pageTitle').innerText = 'User Database'; document.getElementById('navUserDb').classList.add('active'); document.getElementById('navOverview').classList.remove('active'); loadDatabase(); });
    document.getElementById('logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = "index.html"; });
});