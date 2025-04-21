// API endpoints
const API_URL = 'http://localhost:3000';
const QDRANT_URL = 'http://localhost:6333';

// DOM Elements
let profileData = { profiles: [] };
let profilesListDiv;
let collectionNameInput;
let vectorSizeInput;
let distanceMetricSelect;
let createCollectionBtn;
let deleteCollectionBtn;
let listCollectionsBtn;
let statusDiv;
let listStatusDiv;
let embedStatusDiv;
let collectionsListDiv;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    profilesListDiv = document.getElementById('profilesList');
    collectionNameInput = document.getElementById('collectionName');
    vectorSizeInput = document.getElementById('vectorSize');
    distanceMetricSelect = document.getElementById('distanceMetric');
    createCollectionBtn = document.getElementById('createCollectionBtn');
    deleteCollectionBtn = document.getElementById('deleteCollectionBtn');
    listCollectionsBtn = document.getElementById('listCollectionsBtn');
    statusDiv = document.getElementById('status');
    listStatusDiv = document.getElementById('listStatus');
    embedStatusDiv = document.getElementById('embedStatus');
    collectionsListDiv = document.getElementById('collectionsList');

    // Add event listeners
    createCollectionBtn.addEventListener('click', createCollection);
    deleteCollectionBtn.addEventListener('click', deleteCollection);
    listCollectionsBtn.addEventListener('click', listCollections);
    
    // Load profiles from backend
    fetchProfiles();
});

// --- API Interactions ---

// Fetch profiles from backend
async function fetchProfiles() {
    try {
        const response = await fetch(`${API_URL}/profiles`);
        profileData = await response.json();
        displayProfiles();
    } catch (error) {
        console.error('Error fetching profiles:', error);
        setStatus(statusDiv, `Error fetching profiles: ${error.message}`, true);
    }
}

// Create embedding for a profile
async function createEmbedding(profileId, collectionName) {
    try {
        setStatus(embedStatusDiv, `Creating embedding for profile ${profileId} in collection ${collectionName}...`, false);
        
        const response = await fetch(`${API_URL}/embed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                profileId, 
                collectionName 
            }),
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            setStatus(embedStatusDiv, `Embedding created successfully: ${result.message}`, false);
        } else {
            setStatus(embedStatusDiv, `Failed to create embedding: ${result.message || 'Unknown error'}`, true);
        }
    } catch (error) {
        console.error('Error creating embedding:', error);
        setStatus(embedStatusDiv, `Error creating embedding: ${error.message}`, true);
    }
}

// --- Display Functions ---

// Display profiles in the UI
function displayProfiles() {
    profilesListDiv.innerHTML = ''; // Clear existing list
    profileData.profiles.forEach(profile => {
        const profileDiv = document.createElement('div');
        profileDiv.className = 'profile';
        profileDiv.innerHTML = `
            <strong>User ID:</strong> ${profile.user_id}
            <strong>Input Text:</strong>
            <pre>${profile.input_text}</pre>
            <div class="profile-actions">
                <button class="embed-btn" data-id="${profile.user_id}">Generate Embedding</button>
            </div>
        `;
        profilesListDiv.appendChild(profileDiv);
        
        // Add event listener to the embed button
        const embedBtn = profileDiv.querySelector('.embed-btn');
        embedBtn.addEventListener('click', () => {
            const collectionName = collectionNameInput.value.trim();
            if (!collectionName) {
                setStatus(embedStatusDiv, 'Please enter a collection name to store the embedding.', true);
                return;
            }
            createEmbedding(profile.user_id, collectionName);
        });
    });
}

// --- Status Updates ---
function setStatus(element, message, isError = false) {
    element.textContent = message;
    element.className = isError ? 'status-error' : 'status-success';
    element.style.display = 'block';
    // Hide status after a few seconds
    setTimeout(() => {
        element.style.display = 'none';
        element.textContent = '';
        element.className = '';
    }, 5000);
}

// --- Qdrant Interactions ---

// API Call Helper
async function qdrantRequest(endpoint, options = {}, statusElement = statusDiv) {
    setStatus(statusElement, `Sending request to ${endpoint}...`, false);
    try {
        const response = await fetch(`${QDRANT_URL}${endpoint}`, options);
        const result = await response.json();

        if (response.ok) {
            setStatus(statusElement, `Request to ${endpoint} successful.`, false);
            return { ok: true, data: result };
        } else {
            const errorMsg = result.status?.error || `Request failed (status ${response.status}).`;
            setStatus(statusElement, `Error: ${errorMsg}`, true);
            return { ok: false, error: errorMsg, status: response.status };
        }
    } catch (error) {
        console.error(`Error during fetch to ${endpoint}:`, error);
        setStatus(statusElement, `Network error or Qdrant unreachable: ${error.message}`, true);
        return { ok: false, error: error.message };
    }
}

// Create a new collection
async function createCollection() {
    const collectionName = collectionNameInput.value.trim();
    const vectorSize = parseInt(vectorSizeInput.value, 10);
    const distance = distanceMetricSelect.value;

    if (!collectionName) {
        setStatus(statusDiv, 'Please enter a collection name.', true);
        return;
    }
    if (isNaN(vectorSize) || vectorSize <= 0) {
        setStatus(statusDiv, 'Please enter a valid positive vector size.', true);
        return;
    }

    const result = await qdrantRequest(`/collections/${collectionName}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            vectors: { size: vectorSize, distance: distance }
        }),
    });

    if (result.ok && result.data?.result === true) {
        setStatus(statusDiv, `Collection '${collectionName}' created successfully.`, false);
        // Refresh list after creation
        listCollections();
    } else if (!result.ok) {
        // Status already set by qdrantRequest
        console.error("Create collection failed:", result.error);
    } else {
        setStatus(statusDiv, `Failed to create collection '${collectionName}'. Response: ${JSON.stringify(result.data)}`, true)
    }
}

// Delete a collection
async function deleteCollection() {
    const collectionName = collectionNameInput.value.trim();
    if (!collectionName) {
        setStatus(statusDiv, 'Please enter a collection name to delete.', true);
        return;
    }

    const result = await qdrantRequest(`/collections/${collectionName}`, {
        method: 'DELETE',
    });

    if (result.ok && result.data?.result === true) {
        setStatus(statusDiv, `Collection '${collectionName}' deleted successfully.`, false);
        // Refresh list after deletion
        listCollections();
    } else if (!result.ok) {
        console.error("Delete collection failed:", result.error);
    } else {
        setStatus(statusDiv, `Failed to delete collection '${collectionName}'. Response: ${JSON.stringify(result.data)}`, true)
    }
}

// List all collections
async function listCollections() {
    const result = await qdrantRequest('/collections', {}, listStatusDiv);

    if (result.ok) {
        const collections = result.data?.result?.collections || [];
        collectionsListDiv.innerHTML = `<pre>${JSON.stringify(collections, null, 2)}</pre>`;
        setStatus(listStatusDiv, 'Collections listed successfully.', false);
    } else {
        collectionsListDiv.innerHTML = `<pre>Error listing collections: ${result.error}</pre>`;
        // Status already set by qdrantRequest
        console.error("List collections failed:", result.error);
    }
} 