document.addEventListener('DOMContentLoaded', function() {
    const navItem = document.querySelector('.nav-item');
    navItem.addEventListener('click', function() {
        const dropdown = navItem.querySelector('.dropdown');
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
});