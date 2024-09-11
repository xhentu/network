document.addEventListener('DOMContentLoaded', function() {
    // Create the post form dynamically
    createPostForm();

    // Handle form submission
    handlePostFormSubmission();

    // Fetch and display existing posts
    fetchAndDisplayPosts();
});

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

// Function to handle the form submission
function handlePostFormSubmission() {
    const postForm = document.getElementById('post-form');
    postForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the page from refreshing

        const content = document.getElementById('post-content').value;
        // Log the data being sent
        console.log("Sending POST data:", { content });
        // Send the post data to the server
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
            console.log("Received POST response:", result); // Log the result from the server

            // Clear the form input
            document.getElementById('post-content').value = '';

            // Add the newly created post to the page
            appendPost(result);
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
        console.log("Received GET response:", posts); // Log the posts data

        // Create a container to hold the posts
        const postContainer = document.createElement('div');
        posts.forEach(post => {
            appendPost(post, postContainer); // Append each post
        });

        // Insert the post container after the form
        const postFormContainer = document.getElementById('post-form-container');
        postFormContainer.insertAdjacentElement('afterend', postContainer);
    })
    .catch(error => console.error('Error:', error));
}

// Helper function to append a post to the page
function appendPost(post, container = null) {
    // Convert timestamp to a Date object
    const timestamp = new Date(post.timestamp);

    // Format the timestamp to a more human-readable format
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

    // Create a new div and set its innerHTML to the postHtml
    const postDiv = document.createElement('div');
    postDiv.innerHTML = postHtml;

    // If a container is provided, append to it; otherwise, append after the form
    if (container) {
        container.appendChild(postDiv);
    } else {
        const postFormContainer = document.getElementById('post-form-container');
        postFormContainer.insertAdjacentElement('afterend', postDiv);
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
