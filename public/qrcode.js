document.getElementById('qrForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("grgr")
    const url = document.getElementById('qrInput').value;
    if (!url.trim()) return alert('Please enter a valid URL');

    const response = await fetch('/generate-qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });

    const data = await response.json();
    if (data.success) {
        document.getElementById('qrContainer').innerHTML = `<img src="/qr-code.png" alt="QR Code">`;
    } else {
        alert('Error generating QR Code');
    }
});
