class NoopCaptchaProvider {
    async verify() {
        return {
            success: true,
            provider: "noop",
        };
    }
}

export { NoopCaptchaProvider };
