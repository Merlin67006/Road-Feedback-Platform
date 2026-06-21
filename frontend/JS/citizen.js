// API endpoint (change to your backend URL when deployed)
const API_URL = 'http://localhost:5000/api';

// Initialize map
let map;
let marker;

function initMap() {
    // Default location (center of city - adjust as needed)
    const defaultLocation = [28.6139, 77.2090]; // Delhi coordinates
    
    map = L.map('map').setView(defaultLocation, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add click handler to map
    map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng]).addTo(map);
        }
        
        document.getElementById('lat').value = lat;
        document.getElementById('lng').value = lng;
        
        // Reverse geocode to get address
        reverseGeocode(lat, lng);
    });
}

// Reverse geocode coordinates to address
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        if (data.display_name) {
            document.getElementById('location').value = data.display_name;
        }
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
    }
}

// Get user's current location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                map.setView([lat, lng], 15);
                
                if (marker) {
                    marker.setLatLng([lat, lng]);
                } else {
                    marker = L.marker([lat, lng]).addTo(map);
                }
                
                document.getElementById('lat').value = lat;
                document.getElementById('lng').value = lng;
                reverseGeocode(lat, lng);
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to get your location. Please enter address manually.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser');
    }
}

// Handle form submission
document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    const formData = new FormData();
    formData.append('name', document.getElementById('name').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('location', document.getElementById('location').value);
    formData.append('lat', document.getElementById('lat').value);
    formData.append('lng', document.getElementById('lng').value);
    formData.append('image', document.getElementById('image').files[0]);
    
    try {
        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            document.getElementById('successMessage').style.display = 'block';
            document.getElementById('reportForm').reset();
            
            // Clear marker
            if (marker) {
                map.removeLayer(marker);
                marker = null;
            }
            
            // Scroll to success message
            document.getElementById('successMessage').scrollIntoView({ behavior: 'smooth' });
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                document.getElementById('successMessage').style.display = 'none';
            }, 5000);
        } else {
            alert('Error: ' + (data.error || 'Failed to submit report'));
        }
    } catch (error) {
        console.error('Submission error:', error);
        alert('Failed to submit report. Please check your connection.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
    }
});

// Toggle location checkbox
document.getElementById('useLocation').addEventListener('change', (e) => {
    if (e.target.checked) {
        getUserLocation();
    }
});

// Initialize map when page loads
window.addEventListener('load', () => {
    initMap();
    
    // Auto-get location if checkbox is checked
    if (document.getElementById('useLocation').checked) {
        getUserLocation();
    }
});