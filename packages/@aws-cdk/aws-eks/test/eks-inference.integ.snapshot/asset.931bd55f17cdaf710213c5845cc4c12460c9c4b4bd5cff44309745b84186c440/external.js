"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.external = exports.downloadThumbprint = void 0;
const util = require("node:util");
const tls = require("tls");
const url = require("url");
// eslint-disable-next-line import/no-extraneous-dependencies
const aws = require("aws-sdk");
let client;
function iam() {
    if (!client) {
        client = new aws.IAM();
    }
    return client;
}
function defaultLogger(fmt, ...args) {
    // eslint-disable-next-line no-console
    console.log(fmt, ...args);
}
/**
 * Downloads the CA thumbprint from the issuer URL
 */
async function downloadThumbprint(issuerUrl) {
    exports.external.log(`Downloading certificate authority thumbprint for ${issuerUrl}`);
    return new Promise((ok, ko) => {
        const purl = url.parse(issuerUrl);
        const port = purl.port ? parseInt(purl.port, 10) : 443;
        if (!purl.host) {
            return ko(new Error(`unable to determine host from issuer url ${issuerUrl}`));
        }
        const socket = tls.connect(port, purl.host, { rejectUnauthorized: false, servername: purl.host });
        socket.once('error', ko);
        socket.once('secureConnect', () => {
            // This set to `true` will return the entire chain of certificates as a nested object
            let cert = socket.getPeerCertificate(true);
            const unqiueCerts = new Set();
            do {
                unqiueCerts.add(cert);
                cert = cert.issuerCertificate;
            } while (cert && typeof cert === 'object' && !unqiueCerts.has(cert));
            if (unqiueCerts.size == 0) {
                return ko(new Error(`No certificates were returned for the mentioned url: ${issuerUrl}`));
            }
            // The last `cert` obtained must be the root certificate in the certificate chain
            const rootCert = [...unqiueCerts].pop();
            // Add `ca: true` when node merges the feature. Awaiting resolution: https://github.com/nodejs/node/issues/44905
            if (!(util.isDeepStrictEqual(rootCert.issuer, rootCert.subject))) {
                return ko(new Error(`Subject and Issuer of certificate received are different. 
        Received: \'Subject\' is ${JSON.stringify(rootCert.subject, null, 4)} and \'Issuer\':${JSON.stringify(rootCert.issuer, null, 4)}`));
            }
            const validTo = new Date(rootCert.valid_to);
            const certificateValidity = getCertificateValidity(validTo);
            if (certificateValidity < 0) {
                return ko(new Error(`The certificate has already expired on: ${validTo.toUTCString()}`));
            }
            // Warning user if certificate validity is expiring within 6 months
            if (certificateValidity < 180) {
                /* eslint-disable-next-line no-console */
                console.warn(`The root certificate obtained would expire in ${certificateValidity} days!`);
            }
            socket.end();
            const thumbprint = rootCert.fingerprint.split(':').join('');
            exports.external.log(`Certificate Authority thumbprint for ${issuerUrl} is ${thumbprint}`);
            ok(thumbprint);
        });
    });
}
exports.downloadThumbprint = downloadThumbprint;
/**
 * To get the validity timeline for the certificate
 * @param certDate The valid to date for the certificate
 * @returns The number of days the certificate is valid wrt current date
 */
function getCertificateValidity(certDate) {
    const millisecondsInDay = 24 * 60 * 60 * 1000;
    const currentDate = new Date();
    const validity = Math.round((certDate.getTime() - currentDate.getTime()) / millisecondsInDay);
    return validity;
}
// allows unit test to replace with mocks
/* eslint-disable max-len */
exports.external = {
    downloadThumbprint,
    log: defaultLogger,
    createOpenIDConnectProvider: (req) => iam().createOpenIDConnectProvider(req).promise(),
    deleteOpenIDConnectProvider: (req) => iam().deleteOpenIDConnectProvider(req).promise(),
    updateOpenIDConnectProviderThumbprint: (req) => iam().updateOpenIDConnectProviderThumbprint(req).promise(),
    addClientIDToOpenIDConnectProvider: (req) => iam().addClientIDToOpenIDConnectProvider(req).promise(),
    removeClientIDFromOpenIDConnectProvider: (req) => iam().removeClientIDFromOpenIDConnectProvider(req).promise(),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJleHRlcm5hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxrQ0FBa0M7QUFDbEMsMkJBQTJCO0FBQzNCLDJCQUEyQjtBQUMzQiw2REFBNkQ7QUFDN0QsK0JBQStCO0FBRS9CLElBQUksTUFBZSxDQUFDO0FBRXBCLFNBQVMsR0FBRztJQUNWLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFBRSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7S0FBRTtJQUN4QyxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsR0FBVyxFQUFFLEdBQUcsSUFBVztJQUNoRCxzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBRUQ7O0dBRUc7QUFDSSxLQUFLLFVBQVUsa0JBQWtCLENBQUMsU0FBaUI7SUFDeEQsZ0JBQVEsQ0FBQyxHQUFHLENBQUMsb0RBQW9ELFNBQVMsRUFBRSxDQUFDLENBQUM7SUFFOUUsT0FBTyxJQUFJLE9BQU8sQ0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtRQUNwQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFFdkQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDZCxPQUFPLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQy9FO1FBRUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE9BQU8s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QUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxHQUFHLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLGlCQUFpQixDQUFDLENBQUM7SUFFOUYsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQUVELHlDQUF5QztBQUN6Qyw0QkFBNEI7QUFDZixRQUFBLFFBQVEsR0FBRztJQUN0QixrQkFBa0I7SUFDbEIsR0FBRyxFQUFFLGFBQWE7SUFDbEIsMkJBQTJCLEVBQUUsQ0FBQyxHQUErQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7SUFDbEksMkJBQTJCLEVBQUUsQ0FBQyxHQUErQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7SUFDbEkscUNBQXFDLEVBQUUsQ0FBQyxHQUF5RCxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxxQ0FBcUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7SUFDaEssa0NBQWtDLEVBQUUsQ0FBQyxHQUFzRCxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQ0FBa0MsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7SUFDdkosdUNBQXVDLEVBQUUsQ0FBQyxHQUEyRCxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyx1Q0FBdUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7Q0FDdkssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGlzdGFuYnVsIGlnbm9yZSBmaWxlICovXG5pbXBvcnQgeyBEZXRhaWxlZFBlZXJDZXJ0aWZpY2F0ZSB9IGZyb20gJ25vZGU6dGxzJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnbm9kZTp1dGlsJztcbmltcG9ydCAqIGFzIHRscyBmcm9tICd0bHMnO1xuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgaW1wb3J0L25vLWV4dHJhbmVvdXMtZGVwZW5kZW5jaWVzXG5pbXBvcnQgKiBhcyBhd3MgZnJvbSAnYXdzLXNkayc7XG5cbmxldCBjbGllbnQ6IGF3cy5JQU07XG5cbmZ1bmN0aW9uIGlhbSgpIHtcbiAgaWYgKCFjbGllbnQpIHsgY2xpZW50ID0gbmV3IGF3cy5JQU0oKTsgfVxuICByZXR1cm4gY2xpZW50O1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0TG9nZ2VyKGZtdDogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSkge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhmbXQsIC4uLmFyZ3MpO1xufVxuXG4vKipcbiAqIERvd25sb2FkcyB0aGUgQ0EgdGh1bWJwcmludCBmcm9tIHRoZSBpc3N1ZXIgVVJMXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb3dubG9hZFRodW1icHJpbnQoaXNzdWVyVXJsOiBzdHJpbmcpIHtcbiAgZXh0ZXJuYWwubG9nKGBEb3dubG9hZGluZyBjZXJ0aWZpY2F0ZSBhdXRob3JpdHkgdGh1bWJwcmludCBmb3IgJHtpc3N1ZXJVcmx9YCk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKG9rLCBrbykgPT4ge1xuICAgIGNvbnN0IHB1cmwgPSB1cmwucGFyc2UoaXNzdWVyVXJsKTtcbiAgICBjb25zdCBwb3J0ID0gcHVybC5wb3J0ID8gcGFyc2VJbnQocHVybC5wb3J0LCAxMCkgOiA0NDM7XG5cbiAgICBpZiAoIXB1cmwuaG9zdCkge1xuICAgICAgcmV0dXJuIGtvKG5ldyBFcnJvcihgdW5hYmxlIHRvIGRldGVybWluZSBob3N0IGZyb20gaXNzdWVyIHVybCAke2lzc3VlclVybH1gKSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc29ja2V0ID0gdGxzLmNvbm5lY3QocG9ydCwgcHVybC5ob3N0LCB7IHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsIHNlcnZlcm5hbWU6IHB1cmwuaG9zdCB9KTtcbiAgICBzb2NrZXQub25jZSgnZXJyb3InLCBrbyk7XG5cbiAgICBzb2NrZXQub25jZSgnc2VjdXJlQ29ubmVjdCcsICgpID0+IHtcbiAgICAgIC8vIFRoaXMgc2V0IHRvIGB0cnVlYCB3aWxsIHJldHVybiB0aGUgZW50aXJlIGNoYWluIG9mIGNlcnRpZmljYXRlcyBhcyBhIG5lc3RlZCBvYmplY3RcbiAgICAgIGxldCBjZXJ0ID0gc29ja2V0LmdldFBlZXJDZXJ0aWZpY2F0ZSh0cnVlKTtcblxuICAgICAgY29uc3QgdW5xaXVlQ2VydHMgPSBuZXcgU2V0PERldGFpbGVkUGVlckNlcnRpZmljYXRlPigpO1xuICAgICAgZG8ge1xuICAgICAgICB1bnFpdWVDZXJ0cy5hZGQoY2VydCk7XG4gICAgICAgIGNlcnQgPSBjZXJ0Lmlzc3VlckNlcnRpZmljYXRlO1xuICAgICAgfSB3aGlsZSAoIGNlcnQgJiYgdHlwZW9mIGNlcnQgPT09ICdvYmplY3QnICYmICF1bnFpdWVDZXJ0cy5oYXMoY2VydCkpO1xuXG4gICAgICBpZiAodW5xaXVlQ2VydHMuc2l6ZSA9PSAwKSB7XG4gICAgICAgIHJldHVybiBrbyhuZXcgRXJyb3IoYE5vIGNlcnRpZmljYXRlcyB3ZXJlIHJldHVybmVkIGZvciB0aGUgbWVudGlvbmVkIHVybDogJHtpc3N1ZXJVcmx9YCkpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgbGFzdCBgY2VydGAgb2J0YWluZWQgbXVzdCBiZSB0aGUgcm9vdCBjZXJ0aWZpY2F0ZSBpbiB0aGUgY2VydGlmaWNhdGUgY2hhaW5cbiAgICAgIGNvbnN0IHJvb3RDZXJ0ID0gWy4uLnVucWl1ZUNlcnRzXS5wb3AoKSE7XG5cbiAgICAgIC8vIEFkZCBgY2E6IHRydWVgIHdoZW4gbm9kZSBtZXJnZXMgdGhlIGZlYXR1cmUuIEF3YWl0aW5nIHJlc29sdXRpb246IGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvNDQ5MDVcbiAgICAgIGlmICghKHV0aWwuaXNEZWVwU3RyaWN0RXF1YWwocm9vdENlcnQuaXNzdWVyLCByb290Q2VydC5zdWJqZWN0KSkpIHtcbiAgICAgICAgcmV0dXJuIGtvKG5ldyBFcnJvcihgU3ViamVjdCBhbmQgSXNzdWVyIG9mIGNlcnRpZmljYXRlIHJlY2VpdmVkIGFyZSBkaWZmZXJlbnQuIFxuICAgICAgICBSZWNlaXZlZDogXFwnU3ViamVjdFxcJyBpcyAke0pTT04uc3RyaW5naWZ5KHJvb3RDZXJ0LnN1YmplY3QsIG51bGwsIDQpfSBhbmQgXFwnSXNzdWVyXFwnOiR7SlNPTi5zdHJpbmdpZnkocm9vdENlcnQuaXNzdWVyLCBudWxsLCA0KX1gKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHZhbGlkVG8gPSBuZXcgRGF0ZShyb290Q2VydC52YWxpZF90byk7XG4gICAgICBjb25zdCBjZXJ0aWZpY2F0ZVZhbGlkaXR5ID0gZ2V0Q2VydGlmaWNhdGVWYWxpZGl0eSh2YWxpZFRvKTtcblxuICAgICAgaWYgKGNlcnRpZmljYXRlVmFsaWRpdHkgPCAwKSB7XG4gICAgICAgIHJldHVybiBrbyhuZXcgRXJyb3IoYFRoZSBjZXJ0aWZpY2F0ZSBoYXMgYWxyZWFkeSBleHBpcmVkIG9uOiAke3ZhbGlkVG8udG9VVENTdHJpbmcoKX1gKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFdhcm5pbmcgdXNlciBpZiBjZXJ0aWZpY2F0ZSB2YWxpZGl0eSBpcyBleHBpcmluZyB3aXRoaW4gNiBtb250aHNcbiAgICAgIGlmIChjZXJ0aWZpY2F0ZVZhbGlkaXR5IDwgMTgwKSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlICovXG4gICAgICAgIGNvbnNvbGUud2FybihgVGhlIHJvb3QgY2VydGlmaWNhdGUgb2J0YWluZWQgd291bGQgZXhwaXJlIGluICR7Y2VydGlmaWNhdGVWYWxpZGl0eX0gZGF5cyFgKTtcbiAgICAgIH1cblxuICAgICAgc29ja2V0LmVuZCgpO1xuXG4gICAgICBjb25zdCB0aHVtYnByaW50ID0gcm9vdENlcnQuZmluZ2VycHJpbnQuc3BsaXQoJzonKS5qb2luKCcnKTtcbiAgICAgIGV4dGVybmFsLmxvZyhgQ2VydGlmaWNhdGUgQXV0aG9yaXR5IHRodW1icHJpbnQgZm9yICR7aXNzdWVyVXJsfSBpcyAke3RodW1icHJpbnR9YCk7XG5cbiAgICAgIG9rKHRodW1icHJpbnQpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBUbyBnZXQgdGhlIHZhbGlkaXR5IHRpbWVsaW5lIGZvciB0aGUgY2VydGlmaWNhdGVcbiAqIEBwYXJhbSBjZXJ0RGF0ZSBUaGUgdmFsaWQgdG8gZGF0ZSBmb3IgdGhlIGNlcnRpZmljYXRlXG4gKiBAcmV0dXJucyBUaGUgbnVtYmVyIG9mIGRheXMgdGhlIGNlcnRpZmljYXRlIGlzIHZhbGlkIHdydCBjdXJyZW50IGRhdGVcbiAqL1xuZnVuY3Rpb24gZ2V0Q2VydGlmaWNhdGVWYWxpZGl0eShjZXJ0RGF0ZTogRGF0ZSk6IE51bWJlciB7XG4gIGNvbnN0IG1pbGxpc2Vjb25kc0luRGF5ID0gMjQgKiA2MCAqIDYwICogMTAwMDtcbiAgY29uc3QgY3VycmVudERhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gIGNvbnN0IHZhbGlkaXR5ID0gTWF0aC5yb3VuZCgoY2VydERhdGUuZ2V0VGltZSgpIC0gY3VycmVudERhdGUuZ2V0VGltZSgpKSAvIG1pbGxpc2Vjb25kc0luRGF5KTtcblxuICByZXR1cm4gdmFsaWRpdHk7XG59XG5cbi8vIGFsbG93cyB1bml0IHRlc3QgdG8gcmVwbGFjZSB3aXRoIG1vY2tzXG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5leHBvcnQgY29uc3QgZXh0ZXJuYWwgPSB7XG4gIGRvd25sb2FkVGh1bWJwcmludCxcbiAgbG9nOiBkZWZhdWx0TG9nZ2VyLFxuICBjcmVhdGVPcGVuSURDb25uZWN0UHJvdmlkZXI6IChyZXE6IGF3cy5JQU0uQ3JlYXRlT3BlbklEQ29ubmVjdFByb3ZpZGVyUmVxdWVzdCkgPT4gaWFtKCkuY3JlYXRlT3BlbklEQ29ubmVjdFByb3ZpZGVyKHJlcSkucHJvbWlzZSgpLFxuICBkZWxldGVPcGVuSURDb25uZWN0UHJvdmlkZXI6IChyZXE6IGF3cy5JQU0uRGVsZXRlT3BlbklEQ29ubmVjdFByb3ZpZGVyUmVxdWVzdCkgPT4gaWFtKCkuZGVsZXRlT3BlbklEQ29ubmVjdFByb3ZpZGVyKHJlcSkucHJvbWlzZSgpLFxuICB1cGRhdGVPcGVuSURDb25uZWN0UHJvdmlkZXJUaHVtYnByaW50OiAocmVxOiBhd3MuSUFNLlVwZGF0ZU9wZW5JRENvbm5lY3RQcm92aWRlclRodW1icHJpbnRSZXF1ZXN0KSA9PiBpYW0oKS51cGRhdGVPcGVuSURDb25uZWN0UHJvdmlkZXJUaHVtYnByaW50KHJlcSkucHJvbWlzZSgpLFxuICBhZGRDbGllbnRJRFRvT3BlbklEQ29ubmVjdFByb3ZpZGVyOiAocmVxOiBhd3MuSUFNLkFkZENsaWVudElEVG9PcGVuSURDb25uZWN0UHJvdmlkZXJSZXF1ZXN0KSA9PiBpYW0oKS5hZGRDbGllbnRJRFRvT3BlbklEQ29ubmVjdFByb3ZpZGVyKHJlcSkucHJvbWlzZSgpLFxuICByZW1vdmVDbGllbnRJREZyb21PcGVuSURDb25uZWN0UHJvdmlkZXI6IChyZXE6IGF3cy5JQU0uUmVtb3ZlQ2xpZW50SURGcm9tT3BlbklEQ29ubmVjdFByb3ZpZGVyUmVxdWVzdCkgPT4gaWFtKCkucmVtb3ZlQ2xpZW50SURGcm9tT3BlbklEQ29ubmVjdFByb3ZpZGVyKHJlcSkucHJvbWlzZSgpLFxufTtcbiJdfQ==