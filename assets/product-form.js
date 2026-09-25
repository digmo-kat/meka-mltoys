if (!customElements.get('product-form')) {
	customElements.define(
	  'product-form',
	  class ProductForm extends HTMLElement {
		constructor() {
		  super();

		  this.form = this.querySelector('form');
		  if (this.form) {
		  this.form.querySelector('[name=id]').disabled = false;
		  this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
		  }

		  // Initialize cart with a more robust approach
		  this.initializeCart();

		  this.submitButton = this.querySelector('[type="submit"]');

		  if (document.querySelector('cart-drawer') && this.submitButton) this.submitButton.setAttribute('aria-haspopup', 'dialog');

		  this.hideErrors = this.dataset.hideErrors === 'true';
		}

		initializeCart() {
		  this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

		  // If cart is not found, try again after a short delay
		  if (!this.cart) {
			setTimeout(() => {
			  this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
			}, 100);
		  }
		}

		onSubmitHandler(evt) {
		  evt.preventDefault();
		  if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

		  this.handleErrorMessage();

		  this.submitButton.setAttribute('aria-disabled', true);
		  this.submitButton.classList.add('loading');

		  if (this.querySelector('.loading__spinner')) {
			this.querySelector('.loading__spinner').classList.remove('hidden');
		  }

		  const linkedVariantId = this.form.dataset.linkedVariantId;
		  const formData = new FormData(this.form);

		  // Re-check for cart element in case it wasn't available during initialization
		  if (!this.cart) {
			this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
		  }

		  let config;
		  if (linkedVariantId) {
			// This variant carries a linked addon (e.g. an installation aid) - add both
			// as separate cart line items in one request. NOTE: this intentionally does NOT
			// reuse Globo's `_gpo_parent_product_group` key - Globo's own app-embed script
			// (still active site-wide during the migration) scans the cart on page load and
			// strips any line carrying that exact property that it didn't create itself.
			// `_addon_parent_group` is our own key; cart-drawer.liquid and main-cart-items.liquid
			// check for either key so both Globo and natively-migrated addons render the same way.
			const quantity = Number(formData.get('quantity')) || 1;
			// The JSON request doesn't get form fields for free - carry over the main item's properties[...] inputs.
			const mainProperties = {};
			for (const [key, value] of formData.entries()) {
			  const match = key.match(/^properties\[(.+)\]$/);
			  if (match) mainProperties[match[1]] = value;
			}
			const payload = {
			  items: [
				{ id: Number(formData.get('id')), quantity, properties: mainProperties },
				{
				  id: Number(linkedVariantId),
				  quantity,
				  properties: { _addon_parent_group: `main-${formData.get('id')}` },
				},
			  ],
			};
			if (this.cart) {
			  payload.sections = this.cart.getSectionsToRender().map((section) => section.id);
			  payload.sections_url = window.location.pathname;
			  this.cart.setActiveElement(document.activeElement);
			}
			config = {
			  method: 'POST',
			  headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'X-Requested-With': 'XMLHttpRequest',
			  },
			  body: JSON.stringify(payload),
			};
		  } else {
			config = fetchConfig('javascript');
			config.headers['X-Requested-With'] = 'XMLHttpRequest';
			delete config.headers['Content-Type'];

			if (this.cart) {
			  formData.append(
				'sections',
				this.cart.getSectionsToRender().map((section) => section.id)
			  );
			  formData.append('sections_url', window.location.pathname);
			  this.cart.setActiveElement(document.activeElement);
			}
			config.body = formData;
		  }

		  fetch(`${routes.cart_add_url}`, config)
			.then((response) => response.json())
			.then((response) => {
			  if (response.status) {
				publish(PUB_SUB_EVENTS.cartError, {
				  source: 'product-form',
				  productVariantId: formData.get('id'),
				  errors: response.errors || response.description,
				  message: response.message,
				});
				this.handleErrorMessage(response.description);

				const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
				if (!soldOutMessage) return;
				this.submitButton.setAttribute('aria-disabled', true);
				this.submitButton.querySelector('span').classList.add('hidden');
				soldOutMessage.classList.remove('hidden');
				this.error = true;
				return;
			  } else if (!this.cart) {
				window.location = window.routes.cart_url;
				return;
			  }

			  if (!this.error)
				publish(PUB_SUB_EVENTS.cartUpdate, {
				  source: 'product-form',
				  productVariantId: formData.get('id'),
				  cartData: response,
				});

			  this.error = false;
			  const quickAddModal = this.closest('quick-add-modal');
			  if (quickAddModal) {
				document.body.addEventListener(
				  'modalClosed',
				  () => {
					setTimeout(() => {
					  if (this.cart) {
						this.cart.renderContents(response);
					  }
					});
				  },
				  { once: true }
				);
				quickAddModal.hide(true);
              } else {
                if (this.cart) {
                  // If cart drawer custom element is registered, use its render method; otherwise, fallback to manual refresh + open
                  if (typeof this.cart.renderContents === 'function') {
                    this.cart.renderContents(response);
                  } else {
                    fetch(`${routes.cart_url}?section_id=cart-drawer`)
                      .then((res) => res.text())
                      .then((html) => {
                        const parsed = new DOMParser().parseFromString(html, 'text/html');
                        const drawerHtml = parsed.querySelector('#CartDrawer');
                        const liveDrawer = document.querySelector('#CartDrawer');
                        if (drawerHtml && liveDrawer) {
                          liveDrawer.innerHTML = drawerHtml.innerHTML;
                        }
                        const drawerEl = document.querySelector('cart-drawer');
                        if (drawerEl && typeof drawerEl.open === 'function') drawerEl.open();
                      })
                      .catch(() => {
                        window.location = window.routes.cart_url;
                      });
                  }
                }
              }
			})
			.catch((e) => {
			  console.error(e);
			})
			.finally(() => {
			  this.submitButton.classList.remove('loading');
			  if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
			  if (!this.error) this.submitButton.removeAttribute('aria-disabled');
			  if (this.querySelector('.loading__spinner')) {
				this.querySelector('.loading__spinner').classList.add('hidden');
			  }
			});
		}

		handleErrorMessage(errorMessage = false) {
		  if (this.hideErrors) return;

		  this.errorMessageWrapper =
			this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
		  if (!this.errorMessageWrapper) return;
		  this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

		  this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

		  if (errorMessage) {
			this.errorMessage.textContent = errorMessage;
		  }
		}
	  }
	);
  }
