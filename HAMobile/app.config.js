import 'dotenv/config';

export default ({ config }) => {
  const offline = process.env.EXPO_OFFLINE === '1';
  const { owner, extra, ...rest } = config;
  const { eas, ...extraRest } = extra || {};

  return {
    ...rest,
    // Sin owner/eas en local → no pide login EAS (que estaba tumando la sesión)
    ...(offline ? {} : { owner }),
    extra: {
      ...extraRest,
      ...(offline ? {} : { eas }),
      mapboxAccessToken:
        process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
        process.env.PUBLIC_MAPBOX_ACCESS_TOKEN ||
        '',
    },
    plugins: [
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsImpl: 'mapbox',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          backgroundColor: '#002111',
          resizeMode: 'contain',
          imageWidth: 200,
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow $(PRODUCT_NAME) to use your location.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow $(PRODUCT_NAME) to access your photos.',
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera.',
        },
      ],
    ],
  };
};
