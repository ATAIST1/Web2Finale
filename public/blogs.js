document.addEventListener('DOMContentLoaded', () => {
    fetchBlogs();
});

const blogForm = document.getElementById('blogForm');
const blogIdInput = document.getElementById('blogId');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const authorInput = document.getElementById('author');
const blogsContainer = document.getElementById('blogsContainer');

// ✅ Fetch All Blogs
async function fetchBlogs() {
    const response = await fetch('/blogs');
    const blogs = await response.json();

    blogsContainer.innerHTML = '';
    blogs.forEach(blog => {
        blogsContainer.innerHTML += `
            <div class="blog">
                <h3>${blog.title}</h3>
                <p>${blog.content}</p>
                <p><strong>By: ${blog.author}</strong></p>
                <button onclick="editBlog('${blog._id}', '${blog.title}', '${blog.content}', '${blog.author}')">✏ Edit</button>
                <button onclick="deleteBlog('${blog._id}')">🗑 Delete</button>
            </div>
        `;
    });
}

// ✅ Add or Update Blog
blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const blogData = {
        title: titleInput.value,
        content: contentInput.value,
        author: authorInput.value
    };

    const blogId = blogIdInput.value;
    const method = blogId ? 'PUT' : 'POST';
    const url = blogId ? `/blogs/${blogId}` : '/blogs';

    await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blogData)
    });

    blogForm.reset();
    blogIdInput.value = '';
    fetchBlogs();
});

// ✅ Edit Blog (Fill Form)
function editBlog(id, title, content, author) {
    blogIdInput.value = id;
    titleInput.value = title;
    contentInput.value = content;
    authorInput.value = author;
}

// ✅ Delete Blog
async function deleteBlog(id) {
    await fetch(`/blogs/${id}`, { method: 'DELETE' });
    fetchBlogs();
}
