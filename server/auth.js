const express = require('express')
const validator = require('validator')
const passport = require('passport')

const jwt = require('jsonwebtoken')
const User = require('../data/schema').User
const config = require('./.config')

module.exports = function (app) {
  // test
  app.get('/dashboard', (req, res) => {
    res.status(200).json({
      message: "You're authorized to see this secret message."
    })
  })

  /**
   * Validate the sign up form
   *
   * @param {object} payload - the HTTP body message
   * @returns {object} The result of validation. Object contains a boolean validation result,
   *                   errors tips, and a global message for the whole form.
   */
  function validateSignupForm (payload) {
    const errors = {}
    let isFormValid = true
    let message = ''

    if (!payload || typeof payload.email !== 'string' || !validator.isEmail(payload.email)) {
      isFormValid = false
      errors.email = 'Please provide a correct email address.'
    }

    if (!payload || typeof payload.password !== 'string' || payload.password.trim().length < 8) {
      isFormValid = false
      errors.password = 'Password must have at least 8 characters.'
    }

    if (!payload || typeof payload.name !== 'string' || payload.name.trim().length === 0) {
      isFormValid = false
      errors.name = 'Please provide your name.'
    }

    if (!isFormValid) {
      message = 'Check the form for errors.'
    }

    return {
      success: isFormValid,
      message,
      errors
    }
  }

  /**
   * Validate the login form
   *
   * @param {object} payload - the HTTP body message
   * @returns {object} The result of validation. Object contains a boolean validation result,
   *                   errors tips, and a global message for the whole form.
   */
  function validateLoginForm (payload) {
    const errors = {}
    let isFormValid = true
    let message = ''

    if (!payload || typeof payload.email !== 'string' || payload.email.trim().length === 0) {
      isFormValid = false
      errors.email = 'Please provide your email address.'
    }

    if (!payload || typeof payload.password !== 'string' || payload.password.trim().length === 0) {
      isFormValid = false
      errors.password = 'Please provide your password.'
    }

    if (!isFormValid) {
      message = 'Check the form for errors.'
    }

    return {
      success: isFormValid,
      message,
      errors
    }
  }

  app.post('/auth/signup', (req, res) => {
    const validationResult = validateSignupForm(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: validationResult.message,
        errors: validationResult.errors
      })
    }

    return passport.authenticate('local-signup', (err) => {
      if (err) {
        if (err.name === 'MongoError' && err.code === 11000) {
        // the 11000 Mongo code is for a duplication email error
        // the 409 HTTP status code is for conflict error
          return res.status(409).json({
            success: false,
            message: 'Check the form for errors.',
            errors: {
              email: 'This email is already taken.'
            }
          })
        }

        return res.status(400).json({
          success: false,
          message: 'Could not process the form.'
        })
      }

      return res.status(200).json({
        success: true,
        message: 'You have successfully signed up! Now you should be able to log in.'
      })
    })(req, res)
  })

  app.post('/auth/login', (req, res) => {
    const validationResult = validateLoginForm(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: validationResult.message,
        errors: validationResult.errors
      })
    }

    return passport.authenticate('local-login', (err, token, userData) => {
      if (err) {
        if (err.name === 'IncorrectCredentialsError') {
          return res.status(400).json({
            success: false,
            message: err.message
          })
        }

        return res.status(400).json({
          success: false,
          message: 'Could not process the form.'
        })
      }

      return res.json({
        success: true,
        message: 'You have successfully logged in!',
        token,
        user: userData
      })
    })(req, res)
  })



  // Facebook
  app.post('/auth/facebook', (req, res) => {
    var credentials = req.body;
    console.log(11, credentials)
    User.findOrCreate({ email: credentials.email }, { facebookId: credentials.id, name: encodeURIComponent(credentials.name) }, function (err, user) {
      if (err) {
        return res.status(400).json({
          success: false,
          message: 'Could not process the form.'
        })
      }

      const payload = {
          sub: user._id
      }
      // create a token string
      const token = jwt.sign(payload, config.jwtSecret)

      return res.json({
        success: true,
        message: 'You have successfully logged in!',
        token,
        user: user
      })
    });
  })


}
