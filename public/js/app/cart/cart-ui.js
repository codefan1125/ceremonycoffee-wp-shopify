import { formatAsMoney, isError, turnAnimationFlagOn } from '../utils/utils-common';
import { fetchCart, createLineItemsFromVariants } from '../ws/ws-cart';
import { getProduct } from '../ws/ws-products';
import { animate, animateIn, enable, disable } from '../utils/utils-ux';


/*

Update product variant price

*/
async function updateTotalCartPricing(shopify, cart = false) {

  if (!cart) {
    cart = await fetchCart(shopify);
  }

  try {

    console.log("cart.subtotal: ", cart.subtotal);
    var formattedSubtotal = await formatAsMoney(cart.subtotal);
    console.log("formattedSubtotal: ", formattedSubtotal);

  } catch(e) {
    return e;
  }

  jQuery('.wps-cart .wps-pricing').text(formattedSubtotal);

  return formattedSubtotal;

};


/*

Creates our Empty Cart Notice

*/
function createEmptyCartNotice() {
  return jQuery('<aside class="wps-cart-empty-notice"><h2>Your cart is empty</h2></aside>');
}


/*

Creates our Empty Cart Notice

*/
function removeVariantSelections() {
  jQuery('.wps-btn-dropdown[data-selected="true"]').attr('data-selected', false);
  jQuery('.wps-btn-dropdown[data-selected="true"]').data('selected', false);
}


/*

Update Cart Icon Amount

*/
async function updateCartCounter(shopify, cart) {

  if (isCartEmpty(cart)) {
    emptyCartUI(shopify, cart);

  } else {

    enable(jQuery('.wps-btn-checkout'));

    var $cartCounter = jQuery('.wps-cart-counter');

    var totalItems = cart.lineItems.reduce(function(total, item) {
      return total + item.quantity;
    }, 0);

    $cartCounter.html(totalItems);
    $cartCounter.removeClass('wps-is-hidden');

    if(cart.lineItemCount >= 10) {
      $cartCounter.addClass('wps-cart-counter-lg');

    } else {
      $cartCounter.removeClass('wps-cart-counter-lg');

    }

    if ($cartCounter.length) {

      // turnAnimationFlagOn();

      animate({
        element: $cartCounter,
        inClass: 'wps-bounceInDown',
        oneway: true
      });

    }

  }

};


/*

Find Line Item By Variant ID

*/
function findLineItemByVariantID(cart, variant) {

  return cart.lineItems.filter(function(value, index, ar) {
    return value.variant_id === variant.id;
  })[0];

}


/*

Param: Can be product or variant ID

*/
function findExistingLineItem(id) {

  return jQuery('.wps-cart-item-container')
    .find('.wps-quantity-decrement[data-variant-id="' + id + '"]')
    .closest('.wps-cart-item');

}


/*

Updates the single line item HTML
Returns: String of updated HTML

*/
async function updateSingleProductCartDOM(lineItem, variant) {

  return new Promise(async function(resolve, reject) {

    /*

    Remove item if quantity equals 0

    */
    if (typeof lineItem === "undefined") {

      var $foundLineItem = findExistingLineItem(variant.id);
      $foundLineItem.remove();
      resolve();

    } else {

      var $foundLineItem = findExistingLineItem(lineItem.variant_id);
      var lineItemHTML = '';

      if (!elementExists($foundLineItem)) {
        $foundLineItem = getLineItemTemplate();
      }

      lineItemHTML = renderLineItemImage(lineItem, $foundLineItem);
      lineItemHTML = renderLineItemTitle(lineItem, lineItemHTML);
      lineItemHTML = renderLineItemVariantTitle(lineItem, lineItemHTML);
      lineItemHTML = renderCartQuantities(lineItem, lineItemHTML);

      try {

        lineItemHTML = await formatLineItemMoney(lineItem, lineItemHTML);
        resolve(lineItemHTML);

      } catch (error) {
        console.error(error);

      }

    }

  });

}


/*

Render Cart Quantities

*/
function renderCartQuantities(lineItem, lineItemHTML, $lineItemTemplate = false) {

  if (!$lineItemTemplate) {
    $lineItemTemplate = jQuery(lineItemHTML);
  }

  var $decrement = $lineItemTemplate.find('.wps-quantity-decrement');
  var $increment = $lineItemTemplate.find('.wps-quantity-increment');

  $decrement.attr('data-variant-id', lineItem.variant_id);
  $decrement.attr('data-product-id', lineItem.product_id);

  $increment.attr('data-variant-id', lineItem.variant_id);
  $increment.attr('data-product-id', lineItem.product_id);

  $lineItemTemplate.find('.wps-cart-item__quantity').attr('value', lineItem.quantity);

  return $lineItemTemplate.prop('outerHTML');

}


/*

Format Line Item Money

*/
async function formatLineItemMoney(lineItem, lineItemHTML) {

  return new Promise( async function(resolve, reject) {

    try {

      var formatedPrice = await formatAsMoney(lineItem.line_price);

      resolve( renderCartItemPrice(formatedPrice, lineItemHTML) );

    } catch(error) {
      reject(error);

    }

  });

}


/*

Render Cart Item Price

*/
function renderCartItemPrice(price, lineItemHTML) {

  var $lineItem = jQuery(lineItemHTML);
  var $price = $lineItem.find('.wps-cart-item__price');

  $price.text(price);

  return $lineItem.prop('outerHTML');

}


/*

Contains Default Vairant Title

*/
function containsDefaultVariantTitle(lineItem) {
  return lineItem.variant_title.indexOf('Default Title') !== -1;
}


/*

Get Line Item Link

*/
function getLineItemLink(lineItem) {
  return '/' + wps.productsSlug;
}


/*

Render Line Item Image

*/
function renderLineItemImage(lineItem, lineItemHTML) {

  var $lineItem = jQuery(lineItemHTML);
  var $image = $lineItem.find('.wps-cart-item__img');

  getLineItemLink(lineItem);

  $image.css('background-image', 'url(\'' + getLineItemImage(lineItem) + '\')');

  return $lineItem.prop('outerHTML');

}


/*

Render Line Item Title

*/
function renderLineItemTitle(lineItem, lineItemHTML) {

  var $lineItem = jQuery(lineItemHTML);
  var $title = $lineItem.find('.wps-cart-item__title');

  $title.text(lineItem.title);

  return $lineItem.prop('outerHTML');

}


/*

Render Line Item Variant Title

*/
function renderLineItemVariantTitle(lineItem, lineItemHTML) {

  var $lineItem = jQuery(lineItemHTML);

  if ( !containsDefaultVariantTitle(lineItem) ) {

    var $variantTitle = $lineItem.find('.wps-cart-item__variant-title');
    $variantTitle.text(lineItem.variant_title);

    return $lineItem.prop('outerHTML');

  } else {

    var $variantTitle = $lineItem.find('.wps-cart-item__variant-title');
    $variantTitle.text('');

    return $lineItem.prop('outerHTML');

  }

}


/*

Get Line Item Template

*/
function getLineItemTemplate() {
  return jQuery('#wps-cart-item-template').html();
}


/*

Get Line Item Image

*/
function getLineItemImage(lineItem) {

  if (!lineItem.image) {
    return wps.pluginsPath + '/wp-shopify/public/imgs/placeholder.png';

  } else {
    return lineItem.image.src;
  }

}


/*

Render Line Items

*/
async function renderLineItem(lineItem, index, shopify) {

  return new Promise(async function(resolve, reject) {

    try {
      var lineItemDetails = await getProduct(shopify, lineItem.product_id);
      lineItem.superrr = lineItemDetails;

    } catch(error) {
      console.error('getProduct ', error);
    }

    var lineItemHTML = '';

    lineItemHTML = renderLineItemImage(lineItem, getLineItemTemplate());
    lineItemHTML = renderLineItemTitle(lineItem, lineItemHTML);
    lineItemHTML = renderLineItemVariantTitle(lineItem, lineItemHTML);
    lineItemHTML = renderCartQuantities(lineItem, lineItemHTML);

    try {

      lineItemHTML = await formatLineItemMoney(lineItem, lineItemHTML);
      resolve(lineItemHTML);

    } catch (error) {
      console.error(error);

    }

  });


}


/*

Get Cart Item Container

*/
function getCartItemContainer() {
  return jQuery('.wps-cart-item-container');
}


/*

Render Empty Cart Message

*/
function renderEmptyCartMessage() {

  var $cartItemContainer = getCartItemContainer();

  $cartItemContainer.empty();
  $cartItemContainer.append( createEmptyCartNotice() );

}


/*

Append Cart Items
Param: jQuery Object of item HTML

*/
function emptyAndAppendCartItems($cartLineItems) {

  var $cartItemContainer = getCartItemContainer();

  $cartItemContainer.empty();
  $cartItemContainer.append($cartLineItems);

}


/*

Append Cart Items
Param: jQuery Object of item HTML

*/
function appendSingleCartItem(cartLineItemHTML) {
  getCartItemContainer().append(jQuery(cartLineItemHTML));
}


/*

Element Exist

*/
function elementExists($element) {
  return $element.length;
}


/*

Cart Has Items in DOM

*/
function cartHasItemsDOM() {
  return jQuery('.wps-cart-item-container .wps-cart-item').length;
}


/*

Updates HTML of single line item

*/
function replaceSingleCartItem($existingItem, itemNewHTML) {
  return $existingItem.replaceWith(itemNewHTML);
}


/*

Is Cart Empty

*/
function isCartEmpty(cart) {

  if (cart === undefined || cart.lineItemCount === 0) {
    return true;

  } else {
    return false;
  }

}


/*

Has Existing Cart items

*/
function hasExistingCartItem(variant) {

  var $existingItem = findExistingLineItem(variant.id);

  if ($existingItem.length) {
    return $existingItem;

  } else {
    return false;

  }

}


/*

Render Single Cart Item

*/
async function renderSingleCartItem(shopify, cart, variant) {

  return new Promise(async function(resolve, reject) {

    // Filters the cart items for the one we want ...
    var lineItem = findLineItemByVariantID(cart, variant);

    // Takes care of updating the line items DOM elements ...
    try {
      var itemNewHTML = await updateSingleProductCartDOM(lineItem, variant);

    } catch(error) {
      reject(error)

    }


    /*

    Now that we have the updated HTML, we need to override it
    within the DOM

    */
    if ( cartHasItemsDOM() ) {

      var $existingItem = hasExistingCartItem(variant);

      if ($existingItem) {
        resolve( replaceSingleCartItem($existingItem, itemNewHTML) );

      } else {
        resolve( appendSingleCartItem(itemNewHTML) );
      }

    } else {
      resolve( emptyAndAppendCartItems(jQuery(itemNewHTML)) );

    }

  });

}


/*

Render Cart Items

We have nested promises here ...

*/
async function renderCartItems(shopify, cart = false, variant = false) {

  return new Promise(async function(resolve, reject) {

    /*

    Get cart instance if doesnt exist

    */
    if (!cart) {

      try {
        cart = await fetchCart(shopify);

      } catch(error) {
        cart = await createCart(shopify);
      }

    }

    if ( isCartEmpty(cart) ) {

      emptyCartUI(shopify, cart);
      resolve(cart);

    } else {

      /*

      Updating Single Product Cart DOM

      */
      if (variant) {

        var lineItem = findLineItemByVariantID(cart, variant);

        try {
          var $cartLineItems = await updateSingleProductCartDOM(lineItem, variant);

        } catch(e) {
          reject(e);

        }

      } else {

        /*

        Updating each line item
        Need the closer because of the shopify variable

        */
        try {

          var $cartLineItems = await Promise.all( cart.lineItems.map((lineItem, index) => {
            return renderLineItem(lineItem, index, shopify);
          }) );

        } catch(error) {
          console.error(error);
          reject(error);
        }

        emptyAndAppendCartItems($cartLineItems);

      }

      return resolve(cart);

    }

  });


}


/*

Update Cart Variant

*/
function updateCartVariant(variant, quantity, shopify) {

  return new Promise(async function(resolve, reject) {

    /*

    Grab the cart instance

    */
    try {
      var cart = await fetchCart(shopify);

    } catch(error) {
      reject(error);
    }


    /*

    This takes care of adding the line item data to the Shopify
    cart model. If ensures the data persists across the cart and checkout.

    https://shopify.github.io/js-buy-sdk/api/classes/CartModel.html#method-createLineItemsFromVariants

    */
    try {

      var newCart = await createLineItemsFromVariants({
        variant: variant,
        quantity: quantity
      }, shopify);

    } catch(error) {
      reject(error);
    }


    /*

    The cart should never be empty at this point

    */
    if ( isCartEmpty(newCart) ) {

      emptyCartUI(shopify, newCart);
      resolve(cart);

    } else {

      /*

      Update quantity and price ...

      */
      try {

        await renderSingleCartItem(shopify, newCart, variant);

      } catch(error) {
        reject(error);
      }


      /*

      Update Cart Total ...

      */
      try {
        await updateTotalCartPricing(shopify, newCart);

      } catch(error) {
        reject(error);
      }

      resolve(newCart);

    }

  });

};


/*

Checks if the cart is currently open or not.

*/
function cartIsOpen() {

  var isOpen = jQuery('.wps-cart').hasClass('wps-is-visible');
  return isOpen ? true : false;

}


/*

Close Cart

*/
function closeCart() {

  if (cartIsOpen()) {
    jQuery('.wps-cart').removeClass('wps-is-visible wps-slideInRight wps-bounceOutRight');
  }

}


/*

Toggle Cart

*/
async function toggleCart() {

  try {

    await animate({
      inClass: 'wps-slideInRight',
      outClass: 'wps-bounceOutRight',
      element: jQuery('.wps-cart')
    });

    // Removing green button success icons
    removeVariantSelections();

  } catch(error) {
    console.error("toggleCart", error);
  }

}


/*

Empty Cart UI

*/
function emptyCartUI(shopify, cart) {

  disable(jQuery('.wps-btn-checkout'));
  jQuery('.wps-cart-counter').addClass('wps-is-hidden');
  renderEmptyCartMessage();
  updateTotalCartPricing();

}


export {
  updateTotalCartPricing,
  updateCartCounter,
  renderCartItems,
  updateCartVariant,
  toggleCart,
  closeCart,
  cartIsOpen,
  renderSingleCartItem,
  isCartEmpty,
  emptyCartUI
}
