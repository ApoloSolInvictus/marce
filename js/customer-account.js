jQuery.noConflict();
jQuery(document).ready(function($){
	"use strict";

	var CHECKOUT_EMAIL_KEY = 'eternaEspressioneCheckoutEmail';
	var $form = $('#customer-login-form');
	var $status = $('#account-status');
	var $email = $('#customer-email');
	var $password = $('#customer-password');
	var $google = $('[data-auth-action="google"]');
	var $logout = $('[data-auth-action="logout"]');
	var $orderList = $('[data-account-orders]');
	var $orderIntro = $('[data-account-order-intro]');

	if(!$form.length) return;

	function setStatus(message, isError) {
		$status.text(message);
		$status.toggleClass('account-status-error', !!isError);
	}

	function normalizeEmail(email) {
		if(window.EternaFirebaseAuth) return window.EternaFirebaseAuth.normalizeEmail(email);
		return String(email || '').trim().toLowerCase();
	}

	function safeText(value) {
		return String(value || '').replace(/[<>&"]/g, function(match) {
			return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[match];
		});
	}

	function expectedCheckoutEmail() {
		try {
			return normalizeEmail(localStorage.getItem(CHECKOUT_EMAIL_KEY) || '');
		} catch(error) {
			return '';
		}
	}

	function storeCheckoutEmail(email) {
		try {
			if(email) localStorage.setItem(CHECKOUT_EMAIL_KEY, normalizeEmail(email));
		} catch(error) {}
	}

	function buttonBusy($button, busy) {
		$button.prop('disabled', !!busy).toggleClass('auth-busy', !!busy);
	}

	function authUnavailable() {
		return !window.EternaFirebaseAuth;
	}

	function authError(error) {
		var message = error && error.message ? error.message : 'Firebase sign-in could not be completed.';
		setStatus(message, true);
	}

	function renderOrders(orders) {
		if(!$orderList.length) return;

		if(!orders || !orders.length) {
			$orderList.html('<p>No purchases are connected to this account yet. Use the same email from checkout so new orders appear here.</p>');
			if($orderIntro.length) $orderIntro.text('Signed in account ready. Purchases made with this email will appear here.');
			return;
		}

		if($orderIntro.length) $orderIntro.text('Recent orders connected to your signed-in email.');
		$orderList.html(orders.map(function(order){
			var items = Array.isArray(order.items) ? order.items : [];
			var firstItem = items[0] || {};
			var title = firstItem.title || 'Eterna Espressione Artwork';
			var image = firstItem.image || 'images/paintings/29.jpeg';
			var status = order.status || 'checkout_started';
			var progress = Number(order.progress || 0);

			return [
				'<div class="customer-order-card">',
				'<img src="' + safeText(image) + '" alt="' + safeText(title) + '">',
				'<div>',
				'<h5>' + safeText(title) + '</h5>',
				'<p>Order ' + safeText(order.id) + ' | ' + safeText(status.replace(/_/g, ' ')) + '</p>',
				'<div class="dt-sc-progress dt-sc-progress-striped dt-sc-red"><div class="dt-sc-bar" style="width:' + progress + '%"><div class="dt-sc-bar-text"> Progress <span>' + progress + '%</span></div></div></div>',
				'</div>',
				'</div>'
			].join('');
		}).join(''));
	}

	function loadCustomerOrders() {
		if(authUnavailable()) return;

		window.EternaFirebaseAuth.currentUserPayload()
			.then(function(user){
				if(!user) {
					renderOrders([]);
					return null;
				}

				return fetch('/api/customer-orders', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ idToken: user.idToken })
				});
			})
			.then(function(response){
				if(!response) return null;
				return response.json().then(function(body){
					if(!response.ok) throw new Error(body.error || 'Orders could not be loaded.');
					return body;
				});
			})
			.then(function(body){
				if(body) renderOrders(body.orders || []);
			})
			.catch(function(error){
				if($orderList.length) $orderList.html('<p>' + error.message + '</p>');
			});
	}

	function verifyCheckoutEmail(userEmail) {
		var expected = expectedCheckoutEmail();
		var actual = normalizeEmail(userEmail);

		if(expected && actual && expected !== actual) {
			setStatus('Signed in as ' + actual + '. The checkout email saved on this device is ' + expected + ', so please use the same Google account/email for this purchase.', true);
			return false;
		}

		if(actual) {
			storeCheckoutEmail(actual);
			$email.val(actual);
		}

		return true;
	}

	function updateSignedInState(user) {
		if(user) {
			verifyCheckoutEmail(user.email);
			$logout.show();
			setStatus('Signed in as ' + user.email + '. Purchases with this email will be connected to this account.');
			loadCustomerOrders();
			return;
		}

		$logout.hide();
		setStatus('Sign in with email or Google to connect purchases to your customer account.');
		renderOrders([]);
	}

	function capturePayPalReturn() {
		var params = new URLSearchParams(window.location.search);
		var orderId = params.get('order');
		var paypalOrderId = params.get('token');
		var payment = params.get('payment');

		if(payment !== 'paypal-success' || !orderId || !paypalOrderId) return;

		setStatus('Confirming PayPal payment...');
		fetch('/api/capture-paypal-order', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				orderId: orderId,
				paypalOrderId: paypalOrderId
			})
		})
			.then(function(response){
				return response.json().then(function(body){
					if(!response.ok) throw new Error(body.error || 'PayPal payment could not be confirmed.');
					return body;
				});
			})
			.then(function(){
				setStatus('PayPal payment confirmed. Sign in with the same checkout email to view the order progress.');
				try {
					localStorage.removeItem('eternaEspressioneCart');
				} catch(error) {}
				loadCustomerOrders();
			})
			.catch(function(error){
				setStatus(error.message, true);
			});
	}

	$form.on('submit', function(event){
		event.preventDefault();
		if(authUnavailable()) {
			setStatus('Firebase Auth is not available. Please confirm the Firebase web variables in Vercel.', true);
			return;
		}

		buttonBusy($form.find('[data-auth-action="login"]'), true);
		window.EternaFirebaseAuth.signInWithEmail($email.val(), $password.val())
			.then(function(result){
				verifyCheckoutEmail(result.user.email);
			})
			.catch(authError)
			.finally(function(){
				buttonBusy($form.find('[data-auth-action="login"]'), false);
			});
	});

	$('[data-auth-action="register"]').on('click', function(){
		if(authUnavailable()) {
			setStatus('Firebase Auth is not available. Please confirm the Firebase web variables in Vercel.', true);
			return;
		}

		buttonBusy($(this), true);
		window.EternaFirebaseAuth.registerWithEmail($email.val(), $password.val())
			.then(function(result){
				verifyCheckoutEmail(result.user.email);
				setStatus('Account created for ' + result.user.email + '.');
			})
			.catch(authError)
			.finally(function(){
				buttonBusy($('[data-auth-action="register"]'), false);
			});
	});

	$google.on('click', function(){
		if(authUnavailable()) {
			setStatus('Firebase Auth is not available. Please confirm the Firebase web variables in Vercel.', true);
			return;
		}

		buttonBusy($google, true);
		window.EternaFirebaseAuth.signInWithGoogle()
			.then(function(result){
				verifyCheckoutEmail(result.user.email);
			})
			.catch(authError)
			.finally(function(){
				buttonBusy($google, false);
			});
	});

	$logout.on('click', function(){
		if(authUnavailable()) return;
		window.EternaFirebaseAuth.signOut().catch(authError);
	});

	var savedEmail = expectedCheckoutEmail();
	if(savedEmail) $email.val(savedEmail);

	if(window.EternaFirebaseAuth) {
		window.EternaFirebaseAuth.onAuthStateChanged(updateSignedInState).catch(authError);
	} else {
		setStatus('Firebase Auth scripts are not loaded yet.', true);
	}

	capturePayPalReturn();
});
