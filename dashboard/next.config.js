/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        // Required for wagmi SSR compatibility
    },
    webpack: (config) => {
        // Silence optional React Native / pino-pretty deps pulled in by
        // @metamask/sdk and WalletConnect that don't exist in a browser build.
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "pino-pretty": false,
            "@react-native-async-storage/async-storage": false,
        };
        return config;
    },
};

module.exports = nextConfig;
