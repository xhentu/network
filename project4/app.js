document.addEventListener('DOMContentLoaded', function () {
    // Initially load posts on page load
    loadPosts();

    // Handle navigation to profile page
    document.addEventListener('click', function (event) {
        const target = event.target;

        // If the clicked element is a profile link
        if (target.classList.contains('profile-link')) {
            event.preventDefault();
            const username = target.getAttribute('data-username');
            loadProfile(username); // Load the selected profile
        }
    });
});

// Function to load posts
function loadPosts() {
    clearPage(); // Clear any previous content
    createPostForm(); // Create post form
    handlePostFormSubmission(); // Attach post form submission handler
    fetchAndDisplayPosts(); // Fetch and display posts
}

// Function to create the post form dynamically
function createPostForm() {
    const postFormContainer = document.getElementById('post-form-container');
    const formHtml = `
        <form id="post-form">
            <textarea id="post-content" class="form-control" placeholder="Write something..." required></textarea>
            <button type="submit" class="btn btn-primary mt-2">Post</button>
        </form>
    `;
    postFormContainer.innerHTML = formHtml;
}

// Function to handle the form submission for posts
function handlePostFormSubmission() {
    const postForm = document.getElementById('post-form');
    postForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent page refresh

        const content = document.getElementById('post-content').value;
        // Log the data being sent
        console.log("Sending POST data:", { content });
        
        fetch('/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') // CSRF protection
            },
            body: JSON.stringify({ content: content })
        })
        .then(response => response.json())
        .then(result => {
            console.log("Received POST response:", result); // Log the server response
            document.getElementById('post-content').value = ''; // Clear form
            appendPost(result); // Append the new post
        })
        .catch(error => console.error('Error:', error));
    });
}

// Function to fetch and display posts
function fetchAndDisplayPosts() {
    fetch('/posts', {
        method: 'GET'
    })
    .then(response => response.json())
    .then(posts => {
        console.log("Received GET response (posts):", posts); // Log the posts data
        const postContainer = document.createElement('div');
        posts.forEach(post => {
            appendPost(post, postContainer); // Append each post
        });
        const postFormContainer = document.getElementById('post-form-container');
        postFormContainer.insertAdjacentElement('afterend', postContainer); // Insert posts after form
    })
    .catch(error => console.error('Error:', error));
}

// Function to load a user's profile
function loadProfile(username) {
    clearPage(); // Clear previous content

    fetch(`/profile/${username}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(profile => {
        console.log("Received profile data:", profile); // Log the profile data

        // Create profile header
        const profileHeader = `
            <div class="profile-header">
                <h2>${profile.user.username}</h2>
                <p>Email: ${profile.user.email}</p>
                <p>Followers: ${profile.followers_count}</p>
                <p>Following: ${profile.following_count}</p>
                <button class="btn btn-${profile.is_following ? 'danger' : 'success'}">
                    ${profile.is_following ? 'Unfollow' : 'Follow'}
                </button>
            </div>
        `;

        // Create a container for the profile data
        const profileContainer = document.createElement('div');
        profileContainer.innerHTML = profileHeader;

        // Add the user's posts
        profile.posts.forEach(post => {
            appendPost(post, profileContainer); // Use the same appendPost function from earlier
        });

        // Append the profile content to the body or a specific section
        const mainContent = document.getElementById('main-content');
        mainContent.appendChild(profileContainer); // Append profile content
    })
    .catch(error => console.error('Error:', error));
}

// Function to append a post
function appendPost(post, container = null) {
    const timestamp = new Date(post.timestamp);
    const formattedTimestamp = timestamp.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const postHtml = `
        <div class="post mb-3">
            <strong>${post.user}</strong>
            <p>${post.content}</p>
            <small>${formattedTimestamp}</small>
            <p>Likes: ${post.like_count}</p>
        </div>
    `;

    const postDiv = document.createElement('div');
    postDiv.innerHTML = postHtml;

    if (container) {
        container.appendChild(postDiv); // Append to container
    } else {
        const postFormContainer = document.getElementById('post-form-container');
        postFormContainer.insertAdjacentElement('afterend', postDiv); // Insert after form
    }
}

// Function to clear the previous content from the page
function clearPage() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = ''; // Clear the content in the main content section
    }
}

// CSRF token helper function
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
