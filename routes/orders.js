/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ServiceOrder                = require('../services/orders');
const ServiceAuth                 = require('../services/auth');
const {middlewareServer}          = require('../middleware');
const {authentication, adminAuth} = require('../middleware/authentication');
const {isAdmin}                   = require('../utils/utils');

module.exports = function (app) {
    app.post('/v2/orders', getOrders);
    app.post('/v2/order', getOrder);
    app.post('/v2/order/rma', adminAuth, rma);
    app.post('/v2/order/infoPayment', adminAuth, infoPayment);
    app.post('/v2/order/duplicateItemsFromOrderToCart', authentication, duplicateItemsFromOrderToCart);
    app.post('/v2/order/addpkg', adminAuth, addPackage);
    app.post('/v2/order/delpkg', adminAuth, delPackage);
    app.put('/v2/order/updateStatus', adminAuth, updateStatus);
    app.post('/v2/order/pay/:orderNumber/:lang?', authentication, payOrder);
    app.put('/v2/order/updatePayment', adminAuth, updatePayment);
    app.post('/v2/order/:id', getOrderById);
    app.put('/v2/order/cancel/:id', adminAuth, cancelOrder);
    app.put('/v2/order/requestCancel/:id', authentication, cancelOrderRequest);
    app.put('/v2/order', setOrder);

    // Deprecated
    app.post('/orders/pay/:orderNumber/:lang?', middlewareServer.deprecatedRoute, authentication, payOrder);
};

/**
 * Function returning a list of commands
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getOrders(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.info, req.body.PostBody, 'customer.id');
        if (!isAdmin(req.info)) {
            PostBodyVerified.filter.status = {$nin: ['PAYMENT_FAILED']};
        }
        const result = await ServiceOrder.getOrders(PostBodyVerified);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

/**
 * Function to add or update an order
 */
async function setOrder(req, res, next) {
    // We update the order
    try {
        if (req.body.order._id) {
            const order  = req.body.order;
            const result = await ServiceOrder.setOrder(order);
            return res.json(result);
        }
    } catch (error) {
        return next(error);
    }
}

async function getOrder(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.info, req.body.PostBody, 'customer.id');
        const result           = await ServiceOrder.getOrder(PostBodyVerified);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Return an Order by it's id
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getOrderById(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.info, req.body.PostBody, 'customer.id');
        const result           = await ServiceOrder.getOrderById(req.params.id, PostBodyVerified);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * RMA means Return Material Authorization
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function rma(req, res, next) {
    try {
        const order = await ServiceOrder.rma(req.body.order, req.body.return, req.body.lang);
        res.json(order); // TODO : Why no return
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function infoPayment(req, res, next) {
    try {
        const order = await ServiceOrder.infoPayment(req.body.order, req.body.params, req.body.sendMail, req.body.lang);
        res.json(order); // TODO : Why no return
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function duplicateItemsFromOrderToCart(req, res, next) {
    try {
        req.body.query = await ServiceAuth.validateUserIsAllowedWithoutPostBody(
            req.info,
            {_id: req.body.idOrder || null},
            'customer.id'
        );
        return res.json(await ServiceOrder.duplicateItemsFromOrderToCart(req));
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function addPackage(req, res, next) {
    try {
        await ServiceOrder.addPackage(req.body.order, req.body.package);
        res.end(); // TODO : Why no return
    } catch (err) {
        return next(err);
    }
}

async function delPackage(req, res, next) {
    try {
        res.json(await ServiceOrder.delPackage(req.body.order, req.body.package));
    } catch (err) {
        return next(err);
    }
}

/**
 * Allows you to update the status of an order if this modification can be done manually
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function updateStatus(req, res, next) {
    try {
        await ServiceOrder.updateStatus(req.body, req.params);
        return res.end();
    } catch (err) {
        next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function updatePayment(req, res, next) {
    try {
        return res.json(await ServiceOrder.updatePayment(req.body));
    } catch (e) {
        next(e);
    }
}

async function cancelOrder(req, res, next) {
    try {
        const result = await ServiceOrder.cancelOrder(req.params.id || req.body.id);
        if (result) {
            return res.status(403).json(result);
        }
        res.end();
    } catch (err) {
        return next(err);
    }
}

async function cancelOrderRequest(req, res, next) {
    try {
        const result = await ServiceOrder.cancelOrderRequest(req.params.id || req.body.id, req.info);
        if (result) {
            return res.json({code: 'ORDER_ASK_CANCEL_SUCCESS'});
        }

        res.end();
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function payOrder(req, res, next) {
    try {
        return res.json(await ServiceOrder.payOrder(req));
    } catch (e) {
        next(e);
    }
}
