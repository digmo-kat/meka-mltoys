/*
 * Adds the custom.product_badge_1 pill to product cards rendered by Searchanise
 * (search results and collection pages). Searchanise builds its cards client-side
 * from its own index, which does not carry this metafield, so we look the badge up
 * through the Storefront API (same public token the theme already uses) and insert it.
 *
 * Cards: li.snize-product[data-original-product-id]
 */
(function () {
  var STORE_DOMAIN = 'ml-toys-store.myshopify.com';
  var STORE_TOKEN = 'f0cb8becb65a3ecf724ed615548b01e1';
  var API_VERSION = '2024-01';
  var CACHE_KEY = 'ml-badge-1-v1';
  var CACHE_TTL = 60 * 60 * 1000; // 1 hour
  var CARD_SELECTOR = 'li.snize-product[data-original-product-id]';

  var badges = {}; // product id -> badge text ('' = none)
  var pending = {}; // product id -> true while a request is in flight
  var scanQueued = false;

  function readCache() {
    try {
      var cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      var now = Date.now();
      Object.keys(cache).forEach(function (id) {
        if (cache[id] && now - cache[id].t < CACHE_TTL) badges[id] = cache[id].v;
      });
    } catch (e) {
      /* storage unavailable: fall back to in-memory only */
    }
  }

  function writeCache(ids) {
    try {
      var cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      var now = Date.now();
      ids.forEach(function (id) {
        cache[id] = { v: badges[id], t: now };
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      /* ignore */
    }
  }

  function applyBadge(card) {
    var id = card.getAttribute('data-original-product-id');
    var text = badges[id];
    if (!text || card.querySelector('.product-metafield-badges')) return;

    var wrap = document.createElement('div');
    wrap.className = 'product-metafield-badges product-metafield-badges--snize';
    var pill = document.createElement('span');
    pill.className = 'product-metafield-badges__badge product-metafield-badges__badge--primary';
    pill.textContent = text;
    wrap.appendChild(pill);

    var title = card.querySelector('.snize-title');
    if (title && title.parentNode) {
      title.parentNode.insertBefore(wrap, title);
    } else {
      var body = card.querySelector('.snize-overhidden') || card.querySelector('.snize-item');
      if (body) body.insertBefore(wrap, body.firstChild);
    }
  }

  function fetchBadges(ids) {
    ids.forEach(function (id) {
      pending[id] = true;
    });
    var gids = ids.map(function (id) {
      return 'gid://shopify/Product/' + id;
    });
    var query =
      'query($ids:[ID!]!){nodes(ids:$ids){... on Product{id metafield(namespace:"custom",key:"product_badge_1"){value}}}}';

    fetch('https://' + STORE_DOMAIN + '/api/' + API_VERSION + '/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STORE_TOKEN
      },
      body: JSON.stringify({ query: query, variables: { ids: gids } })
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        var nodes = (res && res.data && res.data.nodes) || [];
        ids.forEach(function (id) {
          badges[id] = '';
        });
        nodes.forEach(function (n) {
          if (!n) return;
          var id = n.id.split('/').pop();
          badges[id] = n.metafield && n.metafield.value ? String(n.metafield.value) : '';
        });
        writeCache(ids);
      })
      .catch(function () {
        /* leave cards unbadged on failure; a later scan will retry */
      })
      .then(function () {
        ids.forEach(function (id) {
          delete pending[id];
        });
        scan();
      });
  }

  function scan() {
    scanQueued = false;
    var cards = document.querySelectorAll(CARD_SELECTOR);
    var toFetch = [];
    for (var i = 0; i < cards.length; i++) {
      var id = cards[i].getAttribute('data-original-product-id');
      if (badges[id] !== undefined) {
        applyBadge(cards[i]);
      } else if (!pending[id] && toFetch.indexOf(id) === -1) {
        toFetch.push(id);
      }
    }
    while (toFetch.length) fetchBadges(toFetch.splice(0, 100));
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    (window.requestAnimationFrame || setTimeout)(scan);
  }

  function init() {
    readCache();
    scan();
    new MutationObserver(queueScan).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
