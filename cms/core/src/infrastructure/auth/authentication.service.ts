import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../../services/base.service';
import { User } from './user.model';

@Injectable({ providedIn: 'root' })
export class AuthenticationService extends BaseService {
    protected apiUrl: string = `${this.baseApiUrl}/auth`;
    private userSubject: BehaviorSubject<User>;
    public user: Observable<User>;

    constructor(httpClient: HttpClient) {
        super(httpClient);
        this.userSubject = new BehaviorSubject<User>(null);
        this.user = this.userSubject.asObservable();
    }

    public get userValue(): User {
        return this.userSubject.value;
    }

    setBaseApiUrl = (baseApiUrl: string): AuthenticationService => {
        this.baseApiUrl = baseApiUrl;
        this.apiUrl = `${baseApiUrl}/auth`;
        return this;
    }

    login(username: string, password: string) {
        return this.httpClient.post<User>(`${this.apiUrl}/login`, { username, password }, { withCredentials: true })
            .pipe(map(user => {
                this.userSubject.next(user);
                this.startRefreshTokenTimer();
                return user;
            }));
    }

    logout() {
        this.httpClient.post<any>(`${this.apiUrl}/revoke-token`, {}, { withCredentials: true }).subscribe();
        this.stopRefreshTokenTimer();
        this.userSubject.next(null);
        //this.router.navigate(['/login']);
    }

    refreshToken() {
        return this.httpClient.post<User>(`${this.apiUrl}/refresh-token`, {}, { withCredentials: true })
            .pipe(map((user) => {
                this.userSubject.next(user);
                this.startRefreshTokenTimer();
                return user;
            }));
    }

    // helper methods
    private refreshTokenTimeout;

    private startRefreshTokenTimer() {
        // parse json object from base64 encoded jwt token
        const jwtToken = JSON.parse(atob(this.userValue.token.split('.')[1]));

        // set a timeout to refresh the token a minute before it expires
        const expires = new Date(jwtToken.exp * 1000);
        const timeout = expires.getTime() - Date.now() - (60 * 1000);
        this.refreshTokenTimeout = setTimeout(() => this.refreshToken().subscribe(), timeout);
    }

    private stopRefreshTokenTimer() {
        clearTimeout(this.refreshTokenTimeout);
    }
}