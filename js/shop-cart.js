(function () {
    'use strict';

    var CART_KEY = 'eternaEspressioneCart';
    var currency = 'USD';

    function readCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        } catch (error) {
            return [];
        }
    }

    function writeCart(items) {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
        updateMiniCart(items);
    }

    function money(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(value || 0);
    }

    function numberFromText(text) {
        var clean = String(text || '').replace(/[^0-9.]/g, '');
        return Number(clean || 0);
    }

    function safeText(value) {
        return String(value || '').replace(/[<>&"]/g, function (match) {
            return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[match];
        });
    }

    function updateMiniCart(items) {
        var cart = items || readCart();
        var count = cart.reduce(function (sum, item) { return sum + Number(item.quantity || 1); }, 0);
        var total = cart.reduce(function (sum, item) {
            return sum + (Number(item.price || 0) * Number(item.quantity || 1));
        }, 0);
        var bagLink = document.querySelector('.shop-links a:last-child');
        if (bagLink) {
            bagLink.textContent = 'Shopping Bag: ' + count + ' item' + (count === 1 ? '' : 's') + ' ' + money(total);
            bagLink.setAttribute('href', 'shop-cart.html');
        }
    }

    function addItem(item) {
        var cart = readCart();
        var existing = cart.find(function (cartItem) { return cartItem.id === item.id; });
        if (existing) {
            existing.quantity = Number(existing.quantity || 1) + 1;
        } else {
            item.quantity = 1;
            cart.push(item);
        }
        writeCart(cart);
    }

    function productFromCard(card) {
        var img = card.querySelector('.product-thumb img');
        var title = card.querySelector('.product-details h5 a');
        var amount = card.querySelector('.product-details .amount');
        var src = img ? img.getAttribute('src') : '';
        var id = src || (title ? title.textContent.trim() : 'artwork');

        return {
            id: id,
            title: title ? title.textContent.trim() : 'Marcello Castagna Artwork',
            image: src,
            price: numberFromText(amount ? amount.textContent : '0')
        };
    }

    function bindShopButtons() {
        var buttons = document.querySelectorAll('.products .product-wrapper .product-title a');
        Array.prototype.forEach.call(buttons, function (button) {
            if (button.textContent.toLowerCase().indexOf('add to cart') === -1) return;

            button.addEventListener('click', function (event) {
                event.preventDefault();
                var card = button.closest('.product-wrapper');
                if (!card) return;

                addItem(productFromCard(card));
                button.classList.add('cart-added');
                button.innerHTML = '<span class="fa fa-check"></span> Added';

                window.setTimeout(function () {
                    window.location.href = 'shop-cart.html';
                }, 450);
            });
        });
    }

    function cartTotal(items) {
        return items.reduce(function (sum, item) {
            return sum + (Number(item.price || 0) * Number(item.quantity || 1));
        }, 0);
    }

    function renderTotals(items) {
        var total = cartTotal(items);
        var subtotalNodes = document.querySelectorAll('.cart_totals .cart-subtotal .amount');
        var totalNodes = document.querySelectorAll('.cart_totals .total .amount');
        Array.prototype.forEach.call(subtotalNodes, function (node) { node.textContent = money(total); });
        Array.prototype.forEach.call(totalNodes, function (node) { node.textContent = money(total); });
    }

    function renderRows(table, items, canRemove) {
        var tbody = table.querySelector('tbody');
        if (!tbody) return;

        var columnCount = canRemove ? 6 : 5;
        if (!items.length) {
            tbody.innerHTML = '<tr class="cart_table_item cart-empty-row"><td colspan="' + columnCount + '">Your cart is empty. Add a painting from the shop to begin.</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(function (item) {
            var quantity = Math.max(1, Number(item.quantity || 1));
            var subtotal = Number(item.price || 0) * quantity;
            return [
                '<tr class="cart_table_item" data-cart-id="' + safeText(item.id) + '">',
                '<td class="product-thumbnail"><a href="shop-detail.html"><img src="' + safeText(item.image) + '" class="attachment-shop_thumbnail wp-post-image" alt="' + safeText(item.title) + '" /></a></td>',
                '<td class="product-name"><h6><a href="shop-detail.html">' + safeText(item.title) + '</a></h6></td>',
                '<td class="product-price"><span class="amount">' + money(Number(item.price || 0)) + '</span></td>',
                '<td class="product-quantity"><div class="quantity"><input type="button" class="minus" value="-"/><input type="number" name="quantity" step="1" value="' + quantity + '" min="1" title="Qty" class="input-text qty text" /><input type="button" class="plus" value="+"/></div></td>',
                '<td class="product-subtotal"><span class="amount">' + money(subtotal) + '</span></td>',
                canRemove ? '<td class="product-remove"><a href="#" class="remove" title="Remove this item">&times;</a></td>' : '',
                '</tr>'
            ].join('');
        }).join('');
    }

    function ensureCheckoutRemoveColumn(table) {
        var headRow = table.querySelector('thead tr');
        if (!headRow || headRow.querySelector('.product-remove')) return;
        var th = document.createElement('th');
        th.className = 'product-remove';
        th.textContent = 'Remove';
        headRow.appendChild(th);
    }

    function bindCartTable(table, canRemove) {
        table.addEventListener('click', function (event) {
            var target = event.target;
            var row = target.closest('tr[data-cart-id]');
            if (!row) return;

            var id = row.getAttribute('data-cart-id');
            var cart = readCart();
            var item = cart.find(function (cartItem) { return cartItem.id === id; });
            if (!item) return;

            if (target.classList.contains('plus')) {
                event.preventDefault();
                item.quantity = Number(item.quantity || 1) + 1;
                writeCart(cart);
                renderCartPages();
            }

            if (target.classList.contains('minus')) {
                event.preventDefault();
                item.quantity = Math.max(1, Number(item.quantity || 1) - 1);
                writeCart(cart);
                renderCartPages();
            }

            if (canRemove && target.classList.contains('remove')) {
                event.preventDefault();
                writeCart(cart.filter(function (cartItem) { return cartItem.id !== id; }));
                renderCartPages();
            }
        });

        table.addEventListener('change', function (event) {
            if (!event.target.classList.contains('qty')) return;
            var row = event.target.closest('tr[data-cart-id]');
            if (!row) return;

            var id = row.getAttribute('data-cart-id');
            var cart = readCart();
            var item = cart.find(function (cartItem) { return cartItem.id === id; });
            if (!item) return;

            item.quantity = Math.max(1, Number(event.target.value || 1));
            writeCart(cart);
            renderCartPages();
        });
    }

    function bindCartActions() {
        var cartForm = document.querySelector('.woocommerce > form');
        if (!cartForm || window.location.pathname.indexOf('shop-cart') === -1) return;

        cartForm.addEventListener('submit', function (event) {
            event.preventDefault();
            var submitter = event.submitter;
            if (submitter && submitter.name === 'continue') {
                window.location.href = 'shop.html';
            } else {
                renderCartPages();
            }
        });
    }

    function checkoutPayload() {
        var form = document.querySelector('form.checkout');
        var data = form ? new FormData(form) : new FormData();
        var items = readCart();
        return {
            email: data.get('billing_email') || '',
            paymentMethod: data.get('payment_method') || 'card',
            amount: Math.round(cartTotal(items) * 100),
            title: items.length === 1 ? items[0].title : 'Eterna Espressione Artwork Order',
            items: items.map(function (item) {
                return {
                    id: item.id,
                    title: item.title,
                    image: item.image,
                    quantity: Number(item.quantity || 1),
                    unitAmount: Math.round(Number(item.price || 0) * 100)
                };
            }),
            customer: {
                firstName: data.get('billing_first_name') || '',
                lastName: data.get('billing_last_name') || '',
                phone: data.get('billing_phone') || '',
                billingAddress1: data.get('billing_address_1') || '',
                billingAddress2: data.get('billing_address_2') || '',
                billingCity: data.get('billing_city') || '',
                billingState: data.get('billing_state') || '',
                billingPostcode: data.get('billing_postcode') || '',
                billingCountry: data.get('billing_country') || '',
                shippingAddress1: data.get('shipping_address_1') || '',
                shippingAddress2: data.get('shipping_address_2') || '',
                shippingCity: data.get('shipping_city') || '',
                shippingState: data.get('shipping_state') || '',
                shippingPostcode: data.get('shipping_postcode') || '',
                shippingCountry: data.get('shipping_country') || '',
                notes: data.get('order_comments') || ''
            }
        };
    }

    function setCheckoutStatus(message, isError) {
        var status = document.querySelector('.checkout-status');
        if (!status) {
            status = document.createElement('p');
            status.className = 'checkout-status';
            var placeOrder = document.querySelector('.place-order');
            if (placeOrder) placeOrder.appendChild(status);
        }
        status.textContent = message;
        status.classList.toggle('checkout-status-error', !!isError);
    }

    function bindCheckout() {
        var form = document.querySelector('form.checkout');
        if (!form) return;

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var submitter = event.submitter;
            if (submitter && submitter.name === 'apply_coupon') {
                setCheckoutStatus('Coupon support can be connected after pricing rules are finalized.');
                return;
            }

            var payload = checkoutPayload();
            if (!payload.items.length) {
                setCheckoutStatus('Your cart is empty. Please add a painting before checkout.', true);
                return;
            }
            if (!payload.email) {
                setCheckoutStatus('Please enter an email address before continuing to secure payment.', true);
                return;
            }

            setCheckoutStatus('Creating secure checkout...');
            fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(function (response) {
                    return response.json().then(function (body) {
                        if (!response.ok) throw new Error(body.error || 'Checkout could not be created.');
                        return body;
                    });
                })
                .then(function (body) {
                    if (body.url) {
                        window.location.href = body.url;
                    } else {
                        setCheckoutStatus('Checkout was created, but no payment URL was returned.', true);
                    }
                })
                .catch(function (error) {
                    setCheckoutStatus(error.message, true);
                });
        });
    }

    function renderCartPages() {
        var items = readCart();
        var tables = document.querySelectorAll('table.shop_table.cart');
        Array.prototype.forEach.call(tables, function (table) {
            ensureCheckoutRemoveColumn(table);
            renderRows(table, items, true);
            if (!table.getAttribute('data-cart-bound')) {
                bindCartTable(table, true);
                table.setAttribute('data-cart-bound', 'true');
            }
        });
        renderTotals(items);
        updateMiniCart(items);
    }

    document.addEventListener('DOMContentLoaded', function () {
        updateMiniCart();
        bindShopButtons();
        bindCartActions();
        bindCheckout();
        renderCartPages();
    });
}());
