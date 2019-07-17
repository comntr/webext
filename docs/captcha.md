# How captchas work

Comntr captchas are like mail postmarks.

In other words, the captcha service (CS) adds a ed25519 signature (a postmark) to a comment if it has a correct answer (A) to a question (Q) that corresponds to that comment (C). How does `CS` know what `(Q, A)` pair corresponds to `C`? By deriving it from its hash: `(Q, A) = F(H(C))`. A trivial derivation function can take the first few digits of `H(C)` and ask to add them up:

```
F(H(C)) = H(H(C) + salt) = 14fc..57f9
Q = "1+4"
A = "5"
```
The question is returned as an SVG picture. Once the question is answered, `CS` signs the comment and gives the signature, so other clients can verify it. This achieves a few things:

- `CS` is almost stateless. It needs to remember `salt` and other variables, but they can change from time to time.
- `CS` can instantly derive `(Q, A)` pairs from `H(C)` and instantly verify them. The most CPU intensive step here is producing the SVG picture.
- The client can't produce `Q` on its own.
- The function `F` that derives `(Q, A)` pairs can be arbitrary and can be changed daily.
- Other clients can verify the postmarks themselves: they only need to get the public key from `CS`. The public key is given with an expiration date, so if gets stolen, `CS` could generate a new keypair to sign new comments, while still letting clients verify comments signed with the old keypair.

The captchas extend the [/docs/filters.md](filters) idea: the admin of the filter can set rules that enable captchas.

1. The admin generates a filter id that matches his public key.
1. The admin uploads rules for the filter that enable captchas:
    ```
    POST /<filter-id>/rules
    { "owner": "...", "captcha": true }
    ```

Writing comments:

1. The client gets the rules with `GET /<filter-id>/rules`.
1. The client writes a comment and sends `H(C)` to `CS`.
1. `CS` derives the `(Q, A)` pair and sends `Q` as an SVG picture to the client.
1. The client renders the picture and lets the user answer it.
1. The client sends `A` to `CS`.
1. `CS` produces the `(Q, A)` pair again and checks the answer.
1. `CS` signs `H(C)` with its private key and returns the signature to the client.
1. The client appends the signature to the comment.

Reading comments:

1. The client gets the rules with `GET /<filter-id>/rules`.
1. The client gets the public keys from `CS`. Multiple keys can be returned, each with its own expiration date:
    ```
    -> GET /keys
    <- { "32..6f": "2019-08-14", "5f..77": "2020-11-03" }
    ```
1. The client downloads the comments.
1. The client checks that every comment has a signature from `CS`.

# The goal of these captchas

The goal is to deter trolls who spam with meaningless comments. It's not a goal to stop sophisticated spammers that use text recognition software or botnets that ddos the service on purpose. The former can be better addressed by human moderators and the latter can't be stopped without specialized anti-ddos techniques.
