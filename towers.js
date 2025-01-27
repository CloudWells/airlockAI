document.addEventListener('DOMContentLoaded', () => {
    const towersList = document.getElementById('towers-list');
  
    async function loadTowers() {
      try {
        const response = await fetch('/api/towers');
        if (!response.ok) {
          throw new Error('Ошибка при загрузке вышек');
        }
        const towers = await response.json();
  
        towersList.innerHTML = ''; // Очищаем список перед заполнением
  
        towers.forEach(tower => {
          const li = document.createElement('li');
          li.classList.add('list-group-item', 'tower-list-item'); // Добавляем классы для стилизации
          
          // Добавляем все нужные данные
          li.innerHTML = `
            <h5 class="mb-1">Вышка ID: ${tower.id}</h5>
            <p class="mb-1">Широта: ${tower.lat.toFixed(5)}, Долгота: ${tower.lng.toFixed(5)}</p>
            <p class="mb-1">Фото: <a href="${tower.photo}" target="_blank">${tower.photo}</a></p>
            <p class="mb-1">Операторы: ${tower.operators}</p>
            <p class="mb-1">Статус: ${tower.status}</p>
            <p class="mb-1">Заметки: ${tower.notes}</p>
          `;
          
          // Добавляем обработчик клика для перехода к вышке на карте
          li.addEventListener('click', () => {
              window.location.href = `index.html?lat=${tower.lat}&lng=${tower.lng}`;
          });
          
          towersList.appendChild(li);
        });
      } catch (error) {
        console.error('Ошибка при загрузке вышек:', error);
        const errorElement = document.createElement('p');
        errorElement.style.color = 'red';
        errorElement.textContent = 'Ошибка при загрузке вышек! Подробности в консоли.';
        towersList.parentNode.insertBefore(errorElement, towersList);
      }
    }
  
    loadTowers(); // Загружаем вышки при загрузке страницы
  });