(function () {
    'use strict';

    var configPromise;
    var authPromise;

    function normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
    }

    function loadConfig() {
        if (configPromise) return configPromise;

        configPromise = fetch('/api/firebase-client-config', {
            headers: { 'Accept': 'application/json' }
        })
            .then(function (response) {
                return response.json().then(function (body) {
                    if (!response.ok) throw new Error(body.error || 'Firebase web configuration is missing.');
                    return body;
                });
            });

        return configPromise;
    }

    function getAuth() {
        if (authPromise) return authPromise;

        authPromise = loadConfig()
            .then(function (config) {
                if (!window.firebase || !window.firebase.initializeApp || !window.firebase.auth) {
                    throw new Error('Firebase Auth library could not be loaded.');
                }

                var apps = window.firebase.apps || [];
                var app = apps.length ? apps[0] : window.firebase.initializeApp(config);
                var auth = app.auth();
                return auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL)
                    .catch(function () {})
                    .then(function () { return auth; });
            });

        return authPromise;
    }

    function onceAuthState() {
        return getAuth().then(function (auth) {
            return new Promise(function (resolve) {
                var unsubscribe = auth.onAuthStateChanged(function (user) {
                    unsubscribe();
                    resolve(user || null);
                });
            });
        });
    }

    function userPayload(user) {
        if (!user) return Promise.resolve(null);

        return user.getIdToken().then(function (token) {
            return {
                uid: user.uid,
                email: normalizeEmail(user.email),
                displayName: user.displayName || '',
                idToken: token
            };
        });
    }

    window.EternaFirebaseAuth = {
        normalizeEmail: normalizeEmail,
        ready: getAuth,
        onAuthStateChanged: function (callback) {
            return getAuth().then(function (auth) {
                return auth.onAuthStateChanged(callback);
            });
        },
        currentUserPayload: function () {
            return onceAuthState().then(userPayload);
        },
        signInWithEmail: function (email, password) {
            return getAuth().then(function (auth) {
                return auth.signInWithEmailAndPassword(normalizeEmail(email), password);
            });
        },
        registerWithEmail: function (email, password) {
            return getAuth().then(function (auth) {
                return auth.createUserWithEmailAndPassword(normalizeEmail(email), password);
            });
        },
        signInWithGoogle: function () {
            return getAuth().then(function (auth) {
                var provider = new window.firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                return auth.signInWithPopup(provider);
            });
        },
        signOut: function () {
            return getAuth().then(function (auth) {
                return auth.signOut();
            });
        }
    };
}());
