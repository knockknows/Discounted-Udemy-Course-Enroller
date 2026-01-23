export const Logger = {
    info: (component: string, message: string, data?: any) => {
        console.log(
            JSON.stringify({
                level: "INFO",
                timestamp: new Date().toISOString(),
                component,
                message,
                data,
            })
        );
    },
    error: (component: string, message: string, error?: any) => {
        console.error(
            JSON.stringify({
                level: "ERROR",
                timestamp: new Date().toISOString(),
                component,
                message,
                error: error
                    ? {
                        message: error.message,
                        stack: error.stack,
                        cause: error.cause,
                    }
                    : undefined,
            })
        );
    },
};
