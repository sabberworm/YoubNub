# YoubNub

Spiritual successor to YubNub.

## Improvements upon YubNub include:

1. YoubNub has user namespaces which allow users to have different command sets.
2. Tokens in URLs can include arbitrary JavaScript code.
3. It’s possible to edit commands after their initial creation.
4. Commands and input can use environment variables. These are set per-user.

## Differences to YubNub

1. Pipe tokens “{…}” in either commands or input aren’t supported.
2. Parameters and their default values have to be specified explicitly and can’t be implied from the tokens.
3. Behaviour is stored in metadata, there are no magic tokens like “[use %20 for spaces]”.
4. The input parser is [shell-quote](http://github.com/substack/node-shell-quote), which parses input more similarly to the way an actual shell would. This means multi-word argument values need to be escaped or quoted. The text argument only has to be quoted if the type or amount of whitespace between words is important.

## Users

Users are very light-weight in YoubNub. In fact, visiting `/name` will create a user namespace with an ID of “name” if it does not exist. There are no passwords; to create a user for yourself, choose an unguessable ID or let YoubNub generate one for you with the `user.create` command.

In addition to the user ID, any user can store a name and an email address hash (for gravatar images), environment variables and command aliases.

## To Do

- [x] Implement internal commands: `man`, `ls`, `preview`
- [ ] Implement calling external commands
- [ ] Implement URL token parsing
- [ ] Command editing/creation UI
- [ ] Choose a frontend framework for more complex UIs
- [ ] Implement alias and env editing in `user.edit` UI
- [ ] Add YubNub command importer script to handle `{ifThen}` cases and the like
- [ ] Recreate YubNub’s get2post functionality.

## Installation

Have a `mongod` running. Optionally configure DB config in lib/config/*.json.

	npm install
	# Optionally enable debug messages
	export DEBUG="YoubNub:*"
	npm start
