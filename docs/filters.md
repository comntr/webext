# How filters work

Comntr filters are a lot like adblock filters.

The web is infested with often inappropriate and sometimes outright malware ads. We solve this by installing a safety screen known as uBlock Origin: it shows us only a subset of the content that we select for ourselves.

Say someone wants to install a comntr widget to their page to let others comment. However unmoderated comments section would quickly turn into a mess. This can be solved by displaying only some of the comments on the page.

For example, the admin of `contoso.com` wants to show comments on the `contoso.com/foobar` page. So he adds the following `iframe` to `/foobar`:

```html
<iframe src="https://comntr.github.io/?tag=ABC&filter=ab16...829c#https://contoso.com/foobar"></iframe>
```

Comments are rendered in the `iframe` as usual. However there is an important difference: the `filter` param tells comntr to hide some of the comments.  Everybody can post and read comments as usual. The admin, that has the proper ed25519 keypair, sees additional controls that can block users or comments.

```
tag:ABC -------------> SHA1 ----+                   KDF(tag, publicKey)
                                |
                                v
                              concat ----> SHA1 ----> filter:ab16...829
                                ^
                                |
publicKey:992...0cf -> SHA1 ----+
```

When a common user sees the comments widget, comntr pulls both comments and the filters:
- `GET /227...387` to get the comments
- `GET /ab1...829` to get the filters

Then it merges the two and displays only comments allowed by the filter. Can an advanced user just remove the `filter` param and see all the unmoderated comments? Absolutely. The goal of this system is to let the admin choose what to show on his page and only that.

When the admin sees the comments, comntr uses his public key to figure out that he is the owner of this filter and can do a few things:
- Show additional controls that can block users or comments.
- Add new filters to `ab1...829`. A new filter is just a regular comment for `ab1...829` where the comment text contains the blocked user id and the reason why.
- Set the *rules* for `ab1...829` so others couldn't add random filters there. All the new filters would have to be signed by the admin's private key anyway, but that would require letting everyone know who the admin is by sharing his public key in the `iframe` src. The *rules* approach is more flexible also: it allows to specify any set of moderators who can modify the filters. But how does the data server know that the admin can set the rules for this `hash`? By verifying the provided public key, tag and signature and comparing `KDF(tag, publicKey)` with the `hash`.
