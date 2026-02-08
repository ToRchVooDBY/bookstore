(function () {
  const STORAGE_KEY = 'bookstore-books';
  const DEFAULT_BOOKS = [
    { id: '1', title: 'Мастер и Маргарита', author: 'Михаил Булгаков', price: 450, imageUrl: 'https://placehold.co/280x400/f5e6d3/5c4a3a?text=Книга+1', description: 'Роман о дьяволе, творчестве и любви в Москве 1930-х годов.' },
    { id: '2', title: '1984', author: 'Джордж Оруэлл', price: 520, imageUrl: 'https://placehold.co/280x400/f5e6d3/5c4a3a?text=Книга+2', description: 'Антиутопия о тоталитарном обществе и потере свободы.' },
    { id: '3', title: 'Тихий Дон', author: 'Михаил Шолохов', price: 680, imageUrl: 'https://placehold.co/280x400/f5e6d3/5c4a3a?text=Книга+3', description: 'Эпопея о жизни донского казачества в годы Гражданской войны.' },
    { id: '4', title: 'Сто лет одиночества', author: 'Габриэль Гарсиа Маркес', price: 590, imageUrl: 'https://placehold.co/280x400/f5e6d3/5c4a3a?text=Книга+4', description: 'Сага о семье Буэндиа и магическом реализме Латинской Америки.' },
    { id: '5', title: 'Преступление и наказание', author: 'Фёдор Достоевский', price: 480, imageUrl: 'https://placehold.co/280x400/f5e6d3/5c4a3a?text=Книга+5', description: 'Роман о совести, наказании и искуплении молодого Раскольникова.' },
    { id: '6', title: 'Маленький принц', author: 'Антуан де Сент-Экзюпери', price: 350, imageUrl: 'https://placehold.co/280x400/f5e6d3/5c4a3a?text=Книга+6', description: 'Философская сказка-притча о дружбе, ответственности и смысле жизни.' }
  ];

  let books = [];
  const cart = [];

  const cartCountEl = document.getElementById('cartCount');
  const cartListEl = document.getElementById('cartList');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartSummaryEl = document.getElementById('cartSummary');
  const orderForm = document.getElementById('orderForm');
  const toast = document.getElementById('toast');
  const bookCardsEl = document.getElementById('bookCards');
  const addBookBtn = document.getElementById('addBookBtn');
  const bookModal = document.getElementById('bookModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalClose = document.getElementById('modalClose');
  const modalCancel = document.getElementById('modalCancel');
  const bookForm = document.getElementById('bookForm');
  const bookIdInput = document.getElementById('bookId');
  const paymentBlock = document.getElementById('paymentBlock');
  const paymentTotalEl = document.getElementById('paymentTotal');
  const paymentForm = document.getElementById('paymentForm');
  const paymentSubmitBtn = document.getElementById('paymentSubmit');
  const cardFields = document.getElementById('cardFields');
  const cardNumberInput = document.getElementById('cardNumber');
  const cardExpiryInput = document.getElementById('cardExpiry');
  const cardCvcInput = document.getElementById('cardCvc');

  let pendingOrderData = null;

  function loadBooks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      books = raw ? JSON.parse(raw) : [...DEFAULT_BOOKS];
    } catch (_) {
      books = [...DEFAULT_BOOKS];
    }
  }

  function saveBooks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }

  function nextId() {
    const ids = books.map((b) => parseInt(b.id, 10)).filter((n) => !isNaN(n));
    return String(ids.length ? Math.max(...ids) + 1 : 1);
  }

  function getPlaceholderImage(title) {
    const text = encodeURIComponent((title || 'Книга').slice(0, 20));
    return `https://placehold.co/280x400/f5e6d3/5c4a3a?text=${text}`;
  }

  function truncateDescription(text, maxLen) {
    if (!text || !String(text).trim()) return '';
    const s = String(text).trim();
    return s.length <= maxLen ? s : s.slice(0, maxLen) + '…';
  }

  function renderBooks() {
    bookCardsEl.innerHTML = books
      .map((book) => {
        const imgSrc = book.imageUrl && book.imageUrl.trim() ? book.imageUrl.trim() : getPlaceholderImage(book.title);
        const desc = truncateDescription(book.description, 120);
        const descHtml = desc ? `<p class="card-description" title="${escapeHtml(book.description || '')}">${escapeHtml(desc)}</p>` : '';
        return `
          <article class="card" data-id="${book.id}">
            <div class="card-image">
              <img src="${imgSrc}" alt="${escapeHtml(book.title)}" onerror="this.src='${getPlaceholderImage(book.title)}'">
            </div>
            <div class="card-body">
              <h3>${escapeHtml(book.title)}</h3>
              <p class="author">${escapeHtml(book.author)}</p>
              ${descHtml}
              <p class="price">${Number(book.price).toLocaleString('ru-RU')} ₽</p>
              <div class="card-actions">
                <button type="button" class="btn btn-card" data-add>В корзину</button>
                <button type="button" class="btn btn-edit" data-edit title="Редактировать">✎</button>
                <button type="button" class="btn btn-delete" data-delete title="Удалить">×</button>
              </div>
            </div>
          </article>`;
      })
      .join('');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function getBookFromCard(card) {
    const id = card.dataset.id;
    const book = books.find((b) => b.id === id);
    if (book) return { id: book.id, title: book.title, author: book.author, price: Number(book.price) };
    const title = card.querySelector('h3').textContent;
    const author = card.querySelector('.author').textContent;
    const priceText = card.querySelector('.price').textContent;
    const price = parseInt(priceText.replace(/\s|\D/g, ''), 10) || 0;
    return { id, title, author, price };
  }

  function addToCart(book) {
    const existing = cart.find((item) => item.id === book.id);
    if (existing) existing.qty += 1;
    else cart.push({ ...book, qty: 1 });
    renderCart();
    showToast('Книга добавлена в корзину');
  }

  function renderCart() {
    cartCountEl.textContent = cart.reduce((sum, item) => sum + item.qty, 0);

    if (cart.length === 0) {
      cartSummaryEl.classList.add('empty');
      if (!cartSummaryEl.querySelector('.empty-msg')) {
        const msg = document.createElement('p');
        msg.className = 'empty-msg';
        msg.textContent = 'Корзина пуста. Добавьте книги из каталога.';
        cartSummaryEl.querySelector('h3').after(msg);
      }
      return;
    }

    cartSummaryEl.classList.remove('empty');
    const emptyMsg = cartSummaryEl.querySelector('.empty-msg');
    if (emptyMsg) emptyMsg.remove();

    cartListEl.innerHTML = cart
      .map(
        (item) =>
          `<li>
            <span>${escapeHtml(item.title)} × ${item.qty}</span>
            <strong>${(item.price * item.qty).toLocaleString('ru-RU')} ₽</strong>
          </li>`
      )
      .join('');

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    cartTotalEl.textContent = total.toLocaleString('ru-RU') + ' ₽';
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._tid);
    toast._tid = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function openModal(book) {
    const isEdit = !!book;
    modalTitle.textContent = isEdit ? 'Редактировать книгу' : 'Добавить книгу';
    bookIdInput.value = book ? book.id : '';
    bookForm.querySelector('[name="title"]').value = book ? book.title : '';
    bookForm.querySelector('[name="author"]').value = book ? book.author : '';
    bookForm.querySelector('[name="price"]').value = book ? book.price : '';
    bookForm.querySelector('[name="imageUrl"]').value = book && book.imageUrl ? book.imageUrl : '';
    bookForm.querySelector('[name="description"]').value = book && book.description ? book.description : '';
    bookModal.classList.add('open');
    bookModal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    bookModal.classList.remove('open');
    bookModal.setAttribute('aria-hidden', 'true');
  }

  addBookBtn.addEventListener('click', () => openModal(null));

  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  bookModal.addEventListener('click', (e) => {
    if (e.target === bookModal) closeModal();
  });

  bookForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const id = bookIdInput.value.trim();
    const title = formData.get('title').trim();
    const author = formData.get('author').trim();
    const price = Math.max(1, parseInt(formData.get('price'), 10) || 0);
    const imageUrl = (formData.get('imageUrl') || '').trim();
    const description = (formData.get('description') || '').trim();

    if (id) {
      const index = books.findIndex((b) => b.id === id);
      if (index !== -1) {
        books[index] = { ...books[index], title, author, price, imageUrl, description };
        showToast('Книга обновлена');
      }
    } else {
      books.push({ id: nextId(), title, author, price, imageUrl, description });
      showToast('Книга добавлена в каталог');
    }
    saveBooks();
    renderBooks();
    closeModal();
    this.reset();
    bookIdInput.value = '';
  });

  bookCardsEl.addEventListener('click', function (e) {
    const card = e.target.closest('.card');
    if (!card) return;

    if (e.target.matches('[data-add]')) {
      const book = getBookFromCard(card);
      addToCart(book);
      e.target.textContent = 'В корзине';
      e.target.classList.add('added');
      return;
    }

    if (e.target.matches('[data-edit]')) {
      const book = books.find((b) => b.id === card.dataset.id);
      if (book) openModal(book);
      return;
    }

    if (e.target.matches('[data-delete]')) {
      const book = books.find((b) => b.id === card.dataset.id);
      if (book && confirm(`Удалить книгу «${book.title}» из каталога?`)) {
        books = books.filter((b) => b.id !== book.id);
        saveBooks();
        renderBooks();
        showToast('Книга удалена');
      }
    }
  });

  orderForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Добавьте книги в корзину перед оформлением заказа.');
      return;
    }
    const formData = new FormData(this);
    pendingOrderData = { customer: Object.fromEntries(formData), cart: cart.map((i) => ({ ...i })) };
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    paymentTotalEl.textContent = total.toLocaleString('ru-RU') + ' ₽';
    paymentBlock.hidden = false;
    paymentBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    updatePaymentUI();
  });

  function updatePaymentUI() {
    const isCard = paymentForm.querySelector('[name="paymentMethod"]:checked').value === 'card';
    cardFields.style.display = isCard ? 'block' : 'none';
    paymentSubmitBtn.textContent = isCard ? 'Оплатить' : 'Подтвердить заказ';
    if (!isCard) {
      cardNumberInput.removeAttribute('required');
      cardExpiryInput.removeAttribute('required');
      cardCvcInput.removeAttribute('required');
    } else {
      cardNumberInput.setAttribute('required', '');
      cardExpiryInput.setAttribute('required', '');
      cardCvcInput.setAttribute('required', '');
    }
  }

  paymentForm.querySelectorAll('[name="paymentMethod"]').forEach((radio) => {
    radio.addEventListener('change', updatePaymentUI);
  });

  function formatCardNumber(value) {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }
  function formatExpiry(value) {
    const v = value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 2) return v.slice(0, 2) + '/' + v.slice(2);
    return v;
  }
  cardNumberInput.addEventListener('input', function () {
    this.value = formatCardNumber(this.value);
  });
  cardExpiryInput.addEventListener('input', function () {
    this.value = formatExpiry(this.value);
  });
  cardCvcInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 4);
  });

  paymentForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const method = paymentForm.querySelector('[name="paymentMethod"]:checked').value;
    if (method === 'card') {
      const digits = cardNumberInput.value.replace(/\D/g, '');
      const expiry = cardExpiryInput.value;
      const cvc = cardCvcInput.value.replace(/\D/g, '');
      if (digits.length < 16) {
        showToast('Введите корректный номер карты (16 цифр).');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        showToast('Введите срок действия в формате ММ/ГГ.');
        return;
      }
      if (cvc.length < 3) {
        showToast('Введите CVC (3–4 цифры с обратной стороны карты).');
        return;
      }
    }
    console.log('Заказ и оплата:', { ...pendingOrderData, paymentMethod: method });
    showToast('Заказ оформлен! Оплата принята. Мы свяжемся с вами в ближайшее время.');
    cart.length = 0;
    pendingOrderData = null;
    renderCart();
    paymentBlock.hidden = true;
    orderForm.reset();
    paymentForm.reset();
    cardNumberInput.value = '';
    cardExpiryInput.value = '';
    cardCvcInput.value = '';
    paymentForm.querySelector('[name="paymentMethod"][value="card"]').checked = true;
    updatePaymentUI();
    document.querySelectorAll('.btn-card.added').forEach((b) => {
      b.textContent = 'В корзину';
      b.classList.remove('added');
    });
  });

  loadBooks();
  renderBooks();
  renderCart();
})();
