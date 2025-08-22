const { withAndroidManifest } = require('@expo/config-plugins');

const META_DATA_NAME = 'com.google.firebase.messaging.default_notification_color';

module.exports = function withNotificationColorFix(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    application['meta-data'] = application['meta-data'] || [];

    // Remove existing conflicting entry
    application['meta-data'] = application['meta-data'].filter(
      (item) => item.$['android:name'] !== META_DATA_NAME
    );

    // Add corrected one
    application['meta-data'].push({
      $: {
        'android:name': META_DATA_NAME,
        'android:resource': '@color/white',
        'tools:replace': 'android:resource'
      }
    });

    return config;
  });
};
