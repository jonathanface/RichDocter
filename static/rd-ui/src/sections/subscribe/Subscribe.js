import React, {useEffect, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {CardElement, useElements, useStripe} from '@stripe/react-stripe-js';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {setSubscriptionFormOpen} from '../../stores/subscriptionSlice';

const Subscribe = () => {
  const [customerID, setCustomerID] = useState('');
  const [subscribeError, setSubscribeError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [product, setProduct] = useState({});

  const isOpen = useSelector((state) => state.subscription.formOpen);
  const dispatch = useDispatch();

  const stripe = useStripe();
  const elements = useElements();


  const handleClose = () => {
    dispatch(setSubscriptionFormOpen(false));
  };

  const confirmCard = async () => {
    setSubscribeError('');
    fetch('/billing/card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({id: customerID})
    }).then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Fetch problem create customer ' + response.status);
    }).then(async (data) => {
      const cardElement = elements.getElement(CardElement);
      // Create a payment method and handle the result
      const {paymentMethod, error} = await stripe.createPaymentMethod({
        customerID: data.customerID,
        type: 'card',
        card: cardElement,
      });
      if (error) {
        setSubscribeError(error);
        return;
      }

      console.log('confirm', paymentMethod);
      setPaymentMethod({'id': paymentMethod.id, 'brand': paymentMethod.card.brand, 'last_four': paymentMethod.card.last4});

      fetch('/billing/customer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({customer_id: customerID, payment_method_id: paymentMethod.id})
      }).then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Fetch problem update customer ' + response.status);
      }).then(async (data) => {
        console.log('customer', data);
        cardElement.clear();
      });
    });
  };

  const getOrCreateStripeCustomer = () => {
    fetch('/billing/customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Fetch problem create customer ' + response.status);
    }).then((data) => {
      console.log('data', data);
      setCustomerID(data.id);
      if (data.payment_methods && data.payment_methods.length) {
        const defaultPayment = data.payment_methods.filter((method) => method.is_default === true);
        setPaymentMethod(defaultPayment[0]);
      }
    }).catch((e) => {
      handleClose();
      console.error('ERROR', e);
    });
  };

  const subscribe = () => {
    console.log('subscribe');
    fetch('/billing/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({payment_method_id: paymentMethod.id, customer_id: customerID, price_id: product.price_id})
    }).then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Fetch problem create subscription ' + response.status);
    }).then((data) => {
      handleClose();
    });
  };

  const getProducts = () => {
    fetch('/billing/products').then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Fetch problem getting products ' + response.status);
    }).then((data) => {
      console.log('products', data);
      setProduct(data[0]);
    });
  };

  useEffect(() => {
    if (isOpen) {
      if (!customerID.length) {
        getOrCreateStripeCustomer();
        getProducts();
      }
    }
  }, [isOpen, customerID, paymentMethod]);

  const handleCardElementChange = (e) => {
    if (e.error) {
      console.log(e.error.message);
    }
  };

  return (
    <Dialog open={isOpen} maxWidth={'md'} fullWidth={true} onClose={handleClose} className="subscribe">
      <DialogTitle>{product.name}</DialogTitle>
      <DialogContent>

        {!paymentMethod ? (
            <CardElement onChange={(e) => handleCardElementChange(e)}/>
          ) : (
            <DialogContentText>
              <span>{product.description + ' for only $' + product.billing_amount + ' a ' + product.billing_frequency}</span><br/>
              <span>Pay with {paymentMethod.brand.toUpperCase() + ' ending in ' + paymentMethod.last_four}</span>
            </DialogContentText>
          )}
        {subscribeError &&
            <div>{subscribeError}</div>
        }
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {!paymentMethod ? (
            <Button onClick={confirmCard}>Submit</Button>
          ) : (
            <Button onClick={subscribe}>Subscribe</Button>
          )}
      </DialogActions>
    </Dialog>

  );
};

export default Subscribe;
