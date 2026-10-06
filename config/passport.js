const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Find the user by email (or create) and sync profile data
async function findOrCreateOAuthUser(provider, profile) {
  const email =
    (profile.emails && profile.emails[0] && profile.emails[0].value) ||
    `${profile.username || profile.id}@users.noreply.${provider}.com`;
  const name = profile.displayName || profile.username || email.split('@')[0];

  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.name = name;                       // sync profile
    user.providerId = user.providerId || String(profile.id);
    await user.save();
  } else {
    user = await User.create({
      name,
      email,
      provider,
      providerId: String(profile.id),
      role: 'Employee'                      // OAuth users always start as Employee
    });
  }
  return user;
}

const base = process.env.BASE_URL || 'http://localhost:5000';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${base}/api/v1/auth/google/callback`
      },
      async (accessToken, refreshToken, profile, done) => {
        try { done(null, await findOrCreateOAuthUser('google', profile)); }
        catch (e) { done(e); }
      }
    )
  );
  console.log('Google OAuth enabled');
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${base}/api/v1/auth/github/callback`,
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try { done(null, await findOrCreateOAuthUser('github', profile)); }
        catch (e) { done(e); }
      }
    )
  );
  console.log('GitHub OAuth enabled');
}

module.exports = passport;
