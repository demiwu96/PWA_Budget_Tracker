const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/styles.css",
    "/js/index.js",
    "/dist/index.bundle.js"
];

const PRECACHE = "precache-v1";
const RUNTIME = "runtime";

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(PRECACHE)
            .then(cache => cache.addAll(FILES_TO_CACHE))
            .then(self.skipWaiting())
    );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener("activate", event => {
    // const currentCaches = [PRECACHE, RUNTIME];
    event.waitUntil(
        createIndexedDB()
    );
});

self.addEventListener("fetch", event => {
    if (!navigator.onLine) {
        console.log("Connected to indexedDB!");
        if (event.request.method == "POST") {
            event.request.json().then(res => {
                const request = self.indexedDB.open("budget");
                request.onsuccess = function (event) {
                    let db = event.target.result;
                    // create a transaction
                    const transaction = db.transaction(["items"], "readwrite");
                    // access object store
                    const store = transaction.objectStore("items");
                    // add record to store with add method.
                    const requestAdd = store.add(res);

                    requestAdd.onsuccess = function (e) {
                        console.log("added!");
                        return;
                    }
                }


            });
        }
        event.respondWith(
            caches.match(event.request).then(function (response) {
                return response || fetch(event.request);
            })
        );
    } else {
        console.log("Processing...")
        processIndexedDBData();
    }

});

function createIndexedDB() {
    const request = self.indexedDB.open("budget", 1);
    request.onupgradeneeded = function (event) {
        const db = event.target.result;
        const store = db.createObjectStore("items", { autoIncrement: true });
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log(db);
    };

    request.onerror = function (event) {
        console.log("Woops! " + event.target.errorCode);
    };
}

function processIndexedDBData() {
    const request = self.indexedDB.open("budget");
    request.onsuccess = function (e) {
        // Succesfully opened, now grab data from there and console log it 
        const db = request.result;
        const transaction = db.transaction(["items"], "readwrite");
        const store = transaction.objectStore("items");

        const getAll = store.getAll();

        getAll.onsuccess = async function (e) {
            let offlineData = getAll.result;

            if(offlineData){
                const response = await fetch("/api/transaction/bulk", {
                    method: "POST",
                    body: JSON.stringify(offlineData),
                    headers: {
                      Accept: "application/json, text/plain, */*",
                      "Content-Type": "application/json"
                    }
                });

                // At this point, we need to open a second transaction in order to delete all offline data
                const transaction2 = db.transaction(["items"], "readwrite");
                const objectStore = transaction2.objectStore("items");
                // Now delete all the data in IndexedDB :) 
                const deleteReq = objectStore.clear();

                deleteReq.onsuccess = function(e){
                    console.log("Clear!");
                }
            }
          
        }

    };
};
