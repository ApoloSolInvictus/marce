(function () {
    'use strict';

    var AUCTION_KEY = 'eternaAuctionPainting29';
    var STARTING_BID = 550;
    var MIN_INCREMENT = 25;
    var DEADLINE = new Date('2026-12-20T23:59:59-06:00');
    var painting = (Array.isArray(window.ETERNA_PAINTINGS) ? window.ETERNA_PAINTINGS : []).find(function (item) {
        return Number(item.number) === 29;
    }) || {
        code: 'AEE129',
        title: 'DOVE E COMINCIATO TUTTO',
        artist: 'Marcello Castagna',
        image: 'images/paintings/29.jpeg',
        technique: 'Acrylic',
        dimensions: 'To be confirmed',
        description: 'Original abstract artwork by Marcello Castagna, presented by Eterna Espressione.'
    };

    function money(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(Number(value || 0));
    }

    function setText(selector, value) {
        var node = document.querySelector(selector);
        if (node) node.textContent = value;
    }

    function localState() {
        try {
            return JSON.parse(localStorage.getItem(AUCTION_KEY) || '{}');
        } catch (error) {
            return {};
        }
    }

    function saveLocalBid(bid) {
        var state = localState();
        var bids = Array.isArray(state.bids) ? state.bids : [];
        bids.unshift({
            name: bid.name,
            amount: bid.amount,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(AUCTION_KEY, JSON.stringify({
            currentBid: bid.amount,
            currentBidderName: bid.name,
            bids: bids.slice(0, 8)
        }));
    }

    function fallbackAuction() {
        var state = localState();
        return {
            startingBid: STARTING_BID,
            minIncrement: MIN_INCREMENT,
            deadline: DEADLINE.toISOString(),
            closed: Date.now() > DEADLINE.getTime(),
            currentBid: Number(state.currentBid || STARTING_BID),
            currentBidderName: state.currentBidderName || null,
            bids: Array.isArray(state.bids) ? state.bids : []
        };
    }

    function renderBids(bids) {
        var list = document.querySelector('[data-auction-bids]');
        if (!list) return;

        if (!bids || !bids.length) {
            list.innerHTML = '<li>No bids yet. Be the first collector to place an offer.</li>';
            return;
        }

        list.innerHTML = bids.map(function (bid) {
            var date = bid.createdAt ? new Date(bid.createdAt) : null;
            var label = date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now';
            return '<li><strong>' + safeText(bid.name || 'Collector') + '</strong><span>' + money(bid.amount) + ' - ' + label + '</span></li>';
        }).join('');
    }

    function safeText(value) {
        return String(value || '').replace(/[<>&"]/g, function (match) {
            return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[match];
        });
    }

    function renderAuction(data) {
        var current = Number(data.currentBid || STARTING_BID);
        var nextBid = current + Number(data.minIncrement || MIN_INCREMENT);
        var amountInput = document.querySelector('[data-auction-amount]');
        var form = document.querySelector('[data-auction-form]');
        var submit = document.querySelector('[data-auction-submit]');

        setText('[data-auction-title]', painting.title);
        setText('[data-auction-code]', painting.code || 'AEE129');
        setText('[data-auction-artist]', painting.artist || 'Marcello Castagna');
        setText('[data-auction-technique]', painting.technique || 'Acrylic');
        setText('[data-auction-dimensions]', painting.dimensions || 'To be confirmed');
        setText('[data-auction-description]', painting.description);
        setText('[data-auction-current]', money(current));
        setText('[data-auction-starting]', money(data.startingBid || STARTING_BID));
        setText('[data-auction-minimum]', money(nextBid));
        setText('[data-auction-leader]', data.currentBidderName ? data.currentBidderName : 'No bids yet');
        setText('[data-auction-deadline]', 'December 20, 2026 at 11:59 PM Costa Rica time');

        if (amountInput) {
            amountInput.min = String(nextBid);
            amountInput.placeholder = money(nextBid);
        }
        if (data.closed && form) form.classList.add('auction-closed');
        if (submit && data.closed) {
            submit.disabled = true;
            submit.value = 'Auction Closed';
        }
        renderBids(data.bids || []);
    }

    function renderArtwork() {
        var image = document.querySelector('[data-auction-image]');
        var link = document.querySelector('[data-auction-detail]');
        if (image) {
            image.src = painting.image || 'images/paintings/29.jpeg';
            image.alt = painting.title + ' by ' + painting.artist;
            image.title = painting.title;
        }
        if (link) link.href = 'shop-detail.html?painting=29';
    }

    function tickCountdown() {
        var nodes = document.querySelectorAll('[data-auction-countdown]');
        if (!nodes.length) return;

        var remaining = DEADLINE.getTime() - Date.now();
        var text = 'Auction closed';

        if (remaining > 0) {
            var days = Math.floor(remaining / 86400000);
            var hours = Math.floor((remaining % 86400000) / 3600000);
            var minutes = Math.floor((remaining % 3600000) / 60000);
            text = days + ' days - ' + hours + ' hours - ' + minutes + ' minutes left';
        }

        Array.prototype.forEach.call(nodes, function (node) {
            node.textContent = text;
        });
    }

    function loadAuction() {
        return fetch('/api/auction-bids')
            .then(function (response) {
                return response.json().then(function (body) {
                    if (!response.ok) throw new Error(body.error || 'Auction could not be loaded.');
                    return body;
                });
            })
            .then(function (body) {
                renderAuction(body);
            })
            .catch(function () {
                renderAuction(fallbackAuction());
                setText('[data-auction-status]', 'Preview mode: bids will be saved on this device until Firebase is connected on Vercel.');
            });
    }

    function bindForm() {
        var form = document.querySelector('[data-auction-form]');
        if (!form) return;

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var status = document.querySelector('[data-auction-status]');
            var formData = new FormData(form);
            var bid = {
                name: String(formData.get('name') || '').trim(),
                email: String(formData.get('email') || '').trim(),
                amount: Number(formData.get('amount') || 0)
            };

            if (status) status.textContent = 'Sending your bid...';

            fetch('/api/auction-bids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bid)
            })
                .then(function (response) {
                    return response.json().then(function (body) {
                        if (!response.ok) {
                            var apiError = new Error(body.error || 'The bid could not be placed.');
                            apiError.status = response.status;
                            throw apiError;
                        }
                        return body;
                    });
                })
                .then(function (body) {
                    if (status) status.textContent = 'Your bid was accepted. The auction value has been updated.';
                    form.reset();
                    renderAuction(body);
                    return loadAuction();
                })
                .catch(function (error) {
                    var canPreview = !error.status || error.status >= 500;
                    var fallback = fallbackAuction();
                    var required = Number(fallback.currentBid || STARTING_BID) + MIN_INCREMENT;
                    if (canPreview && bid.name && bid.email && bid.amount >= required && Date.now() <= DEADLINE.getTime()) {
                        saveLocalBid(bid);
                        renderAuction(fallbackAuction());
                        form.reset();
                        if (status) status.textContent = 'Preview mode: your bid was saved on this device. Configure Firebase in Vercel to save bids for all visitors.';
                        return;
                    }
                    if (status) status.textContent = error.message || 'Please review your bid and try again.';
                });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderArtwork();
        tickCountdown();
        window.setInterval(tickCountdown, 60000);
        bindForm();
        loadAuction();
        window.setInterval(loadAuction, 30000);
    });
}());
