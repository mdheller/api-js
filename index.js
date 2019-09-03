const axios = require("axios");

const grantType = "client_credentials";
const authenticationHost = "https://auth.emvi.com";
const apiHost = "https://api.emvi.com";
const authenticationEndpoint = "/api/v1/auth/token";
const searchArticlesEndpoint = "/api/v1/search/article";
const searchListsEndpoint = "/api/v1/search/list";
const searchTagsEndpoint = "/api/v1/search/tag";
const searchAllEndpoint = "/api/v1/search";

module.exports = class EmviClient {
	constructor(client_id, client_secret, organization, config) {
		this.client_id = client_id;
		this.client_secret = client_secret;
		this.organization = organization;

		if(typeof config !== "object") {
			config = {};
		}

		this.auth_host = config.auth_host || authenticationHost;
		this.api_host = config.api_host || apiHost;
		this.token_type = window.localStorage.getItem("token_type");
        this.access_token = window.localStorage.getItem("access_token");
        this.expires_in = window.localStorage.getItem("expires_in");
		this._addAxiosInterceptor();
	}

	_addAxiosInterceptor() {
		axios.interceptors.response.use(null, e => {
			if(e.config && e.response && e.response.status === 401) {
				return this.refreshToken()
				.then(() => {
					e.config.headers = this._config().headers;
					return axios.request(e.config);
				});
			}

			return Promise.reject(e);
		});
	}

	refreshToken() {
		return new Promise((resolve, reject) => {
			let req = {
				grant_type: grantType,
                client_id: this.client_id,
                client_secret: this.client_secret
			};

			axios.post(this.auth_host+authenticationEndpoint, req)
			.then(r => {
				this.token_type = r.data.token_type;
                this.access_token = r.data.access_token;
                this.expires_in = parseInt(r.data.expires_in);
                window.localStorage.setItem("token_type", this.token_type);
                window.localStorage.setItem("access_token", this.access_token);
                window.localStorage.setItem("expires_in", this.expires_in);
                resolve();
			})
			.catch(e => {
				reject(e);
			});
		});
	}

	findArticles(query, filter) {
		filter = this._checkSearchParamsAndBuildFilter(query, filter);

		return new Promise((resolve, reject) => {
			axios.get(this.api_host+searchArticlesEndpoint, {headers: this._config().headers, params: filter})
			.then(r => {
				resolve({results: r.data.articles || [], count: r.data.count});
			});
		});
	}

	findLists(query, filter) {
		filter = this._checkSearchParamsAndBuildFilter(query, filter);

		return new Promise((resolve, reject) => {
			axios.get(this.api_host+searchListsEndpoint, {headers: this._config().headers, params: filter})
			.then(r => {
				resolve({results: r.data.lists || [], count: r.data.count});
			});
		});
	}

	findTags(query, filter) {
		filter = this._checkSearchParamsAndBuildFilter(query, filter);

		return new Promise((resolve, reject) => {
			axios.get(this.api_host+searchTagsEndpoint, {headers: this._config().headers, params: filter})
			.then(r => {
				resolve({results: r.data.tags || [], count: r.data.count});
			});
		});
	}

	findAll(query, filter) {
		let filterProvided = filter !== undefined && filter !== null;
		filter = this._checkSearchParamsAndBuildFilter(query, filter);

		if(!filterProvided) {
			filter = {
				articles: true,
				lists: true,
				tags: true,
				articles_limit: 0,
				lists_limit: 0,
				tags_limit: 0,
				query
			};
		}

		return new Promise((resolve, reject) => {
			axios.get(this.api_host+searchAllEndpoint, {headers: this._config().headers, params: filter})
			.then(r => {
				resolve(r.data);
			});
		});
	}

	_checkSearchParamsAndBuildFilter(query, filter) {
		if(typeof query !== "string") {
			throw new TypeError("query must be of type string");
		}

		if(filter === undefined || filter === null) {
			filter = {};
		}

		if(typeof filter !== "object") {
			throw new TypeError("filter must be of type object");
		}

		filter.query = query;
		return filter;
	}

	_config() {
		return {
			headers: {
				"Authorization": `Bearer ${this.access_token}`,
				"Organization": this.organization,
				"Client": this.client_id
			}
		};
	}
};
