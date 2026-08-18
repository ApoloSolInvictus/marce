(function () {
    'use strict';

    var deadline = new Date('2026-12-20T23:59:59-06:00');

    function formatRemaining() {
        var remaining = deadline.getTime() - Date.now();
        if (remaining <= 0) return 'Auction closed';

        var days = Math.floor(remaining / 86400000);
        var hours = Math.floor((remaining % 86400000) / 3600000);
        var minutes = Math.floor((remaining % 3600000) / 60000);

        return days + ' days - ' + hours + ' hours - ' + minutes + ' min';
    }

    function tick() {
        var nodes = document.querySelectorAll('[data-hero-auction-countdown]');
        Array.prototype.forEach.call(nodes, function (node) {
            node.textContent = formatRemaining();
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        tick();
        window.setInterval(tick, 60000);
    });
}());
