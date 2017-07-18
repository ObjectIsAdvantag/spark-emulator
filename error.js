
const assert = require('assert');


// Responds an error with the Cisco Spark format    
// {
//     "message": "Content type 'application/xml' not supported",
//     "errors": [
//         {
//             "description": "Content type 'application/xml' not supported"
//         }
//     ],
//     "trackingId": "NA_982ba0e9-a1a7-4eff-9be5-c6e5cdf94d73"
// }
function sendError(res, statusCode, message, error) {
    assert.ok((res), "no response specified");
    assert.ok((statusCode), "no statusCode specified");

    if (!message) {
        res.status(statusCode).send();
        return;
    }

    if (!error) {
        res.status(statusCode).send({
            "message": message,
            "errors": [
                {
                    "description": message
                }
            ],
            "trackingId": "[TODO]"
        });
        return;
    }

    switch (typeof error) {
        case "string":
            res.status(statusCode).send({
                "message": message,
                "errors": [
                    {
                        "description": error
                    }
                ],
                "trackingId": "[TODO]"
            });
            return;

        case "array":
            res.status(statusCode).send({
                "message": message,
                "errors": error,
                "trackingId": "[TODO]"
            });
            return;

    }

    // Should not happen
    debug("implementation issue 'Should not happen' in sendError");
    sendError(500);
}

module.exports = sendError;

