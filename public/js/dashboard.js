let currentFilters = {
    image: false,
    pdf: false,
    doc: false,
    ppt: false,
    size: '',
    search: ''
};
let filesMap = {};

async function fetchProfile() {
    try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        if (data.success) {
            document.getElementById('userNameDisplay').textContent = data.data.user.userName;
            document.getElementById('fileCountDisplay').textContent = data.data.user.filesUploadedCount || 0;
        } else {
            window.location.href = '/login';
        }
    } catch (err) {
        window.location.href = '/login';
    }
}

async function loadFiles() {
    const params = new URLSearchParams();
    if (currentFilters.image) params.append('image', 'true');
    if (currentFilters.pdf) params.append('pdf', 'true');
    if (currentFilters.doc) params.append('doc', 'true');
    if (currentFilters.ppt) params.append('ppt', 'true');
    if (currentFilters.size) params.append('size', currentFilters.size);
    if (currentFilters.search) params.append('search', currentFilters.search);

    try {
        const res = await fetch(`/api/file/all?${params.toString()}`);
        const data = await res.json();
        const tbody = document.getElementById('filesTableBody');
        tbody.innerHTML = '';

        filesMap = {};
        if (!data.success || !data.data.files || data.data.files.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:20px;">No files found matching criteria.</td></tr>';
            return;
        }

        data.data.files.forEach(f => {
            filesMap[f._id] = f;
            const tr = document.createElement('tr');
            const sizeKB = (f.size / 1024).toFixed(1);
            const dateStr = new Date(f.upload_at).toLocaleString();

            tr.innerHTML = `
                <td><strong>${f.name}</strong><br><small style="color:#64748b">${f.originalName}</small></td>
                <td><span class="badge badge-${f.category}">${f.category}</span></td>
                <td>${f.type}</td>
                <td>${sizeKB} KB</td>
                <td>${dateStr}</td>
                <td>
                    <button class="action-btn btn-download" onclick="downloadFile('${f._id}')">Download</button>
                    <button class="action-btn btn-edit" onclick="openUpdateModal('${f._id}')">Update</button>
                    <button class="action-btn btn-delete" onclick="deleteFile('${f._id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load files:', err);
    }
}

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('uploadMessage');
    msg.className = 'msg';
    msg.textContent = 'Uploading file...';

    const fileInput = document.getElementById('fileInput');
    const nameInput = document.getElementById('fileNameInput');

    if (!fileInput.files[0]) {
        msg.className = 'msg error';
        msg.textContent = 'Please choose a file to upload.';
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    if (nameInput.value.trim()) {
        formData.append('name', nameInput.value.trim());
    }

    try {
        const res = await fetch('/api/file/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            msg.className = 'msg success';
            msg.textContent = 'File uploaded successfully!';
            document.getElementById('uploadForm').reset();
            fetchProfile();
            loadFiles();
            setTimeout(() => { msg.textContent = ''; }, 3000);
        } else {
            msg.className = 'msg error';
            msg.textContent = data.message || 'Upload failed.';
        }
    } catch (err) {
        msg.className = 'msg error';
        msg.textContent = 'Error uploading file.';
    }
});

function openUpdateModal(id) {
    const file = filesMap[id];
    document.getElementById('updateFileId').value = id;
    document.getElementById('updateFileName').value = file ? file.name : '';
    document.getElementById('updateFileInput').value = '';
    const msg = document.getElementById('updateMessage');
    msg.textContent = '';
    msg.className = 'msg';
    document.getElementById('updateModal').classList.add('active');
}

function closeUpdateModal() {
    document.getElementById('updateModal').classList.remove('active');
}

document.getElementById('updateFileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('updateFileId').value;
    const name = document.getElementById('updateFileName').value.trim();
    const fileInput = document.getElementById('updateFileInput');
    const msg = document.getElementById('updateMessage');

    const hasNewFile = fileInput.files && fileInput.files[0];
    if (!name && !hasNewFile) {
        msg.className = 'msg error';
        msg.textContent = 'Please enter a name or choose a replacement file.';
        return;
    }

    const formData = new FormData();
    if (name) {
        formData.append('name', name);
    }
    if (hasNewFile) {
        formData.append('file', fileInput.files[0]);
    }

    msg.className = 'msg';
    msg.textContent = 'Updating file...';

    try {
        const res = await fetch(`/api/file/${id}`, {
            method: 'PUT',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            closeUpdateModal();
            loadFiles();
        } else {
            msg.className = 'msg error';
            msg.textContent = data.message || 'Update failed.';
        }
    } catch (err) {
        msg.className = 'msg error';
        msg.textContent = 'Error updating file.';
    }
});

async function downloadFile(id) {
    try {
        const res = await fetch(`/api/file/${id}/download`);
        const data = await res.json();

        if (data.success && data.data && data.data.downloadUrl) {
            // Create a temporary hidden anchor to trigger direct browser download
            const link = document.createElement('a');
            link.href = data.data.downloadUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert(data.message || 'Failed to download file.');
        }
    } catch (err) {
        alert('An error occurred while downloading the file.');
    }
}

async function deleteFile(id) {
    if (!confirm('Are you sure you want to delete this file permanently?')) return;

    try {
        const res = await fetch(`/api/file/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            fetchProfile();
            loadFiles();
        } else {
            alert(data.message || 'Delete failed');
        }
    } catch (err) {
        alert('Failed to delete file.');
    }
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        currentFilters[type] = !currentFilters[type];
        btn.classList.toggle('active', currentFilters[type]);
        loadFiles();
    });
});

document.getElementById('sizeFilter').addEventListener('input', (e) => {
    currentFilters.size = e.target.value;
    loadFiles();
});

document.getElementById('searchInput').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    loadFiles();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/user/logout', { method: 'POST' });
    window.location.href = '/login';
});

// Initial load
fetchProfile();
loadFiles();
